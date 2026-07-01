"""
Personalized Foundation Model & Vector Database Wrapper
Trains joint SVD embeddings for User behavior, Songs, Emotions, and Activities.
Indexes song embeddings using FAISS with NumPy cosine similarity fallback.
Projects embeddings to 2D using PCA for interactive frontend visualization.
"""

import os
import pickle
import logging
import numpy as np
from sklearn.decomposition import TruncatedSVD, PCA

from config.database import db
from models.song import Song
from models.history import History
from models.playlist import Favorite
from models.user import User

logger = logging.getLogger(__name__)

# Dimension of joint embedding space
EMBEDDING_DIM = 16

# File path to save/load embeddings
EMBEDDINGS_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'instance', 'embeddings.pkl')

# Static mappings for Emotions and Activities
EMOTIONS_LIST = ['happy', 'sad', 'angry', 'neutral', 'surprised', 'fearful', 'disgusted']
ACTIVITIES_LIST = ['workout', 'work', 'sleeping', 'relaxing', 'social']

# Default mapping of activities to target moods
ACTIVITY_MOOD_MAP = {
    'workout': ['happy', 'motivated', 'angry'],
    'work': ['neutral'],
    'sleeping': ['neutral', 'sad'],
    'relaxing': ['neutral', 'happy'],
    'social': ['happy', 'surprised']
}

# Vector Database (FAISS) Wrapper with NumPy Fallback
class FAISSVectorDB:
    def __init__(self, dimension=EMBEDDING_DIM):
        self.dimension = dimension
        self.index = None
        self.song_ids = []      # Index-to-SongID map
        self.song_vectors = None # Numpy array of dimensions N x D
        self.index_type = "uninitialized"
        
        # Try importing FAISS
        try:
            import faiss
            self.faiss_available = True
            logger.info("DMI: FAISS successfully imported.")
        except ImportError:
            self.faiss_available = False
            logger.warning("DMI: FAISS not available. Using NumPy fallback similarity index.")

    def rebuild_index(self, song_ids, song_vectors):
        """
        Builds or rebuilds the vector index using FAISS or NumPy array representation.
        """
        self.song_ids = list(song_ids)
        self.song_vectors = np.array(song_vectors, dtype='float32')
        
        if len(self.song_ids) == 0:
            self.index_type = "empty"
            return
            
        # Update self.dimension to match actual shape of loaded vectors
        self.dimension = self.song_vectors.shape[1]
            
        # L2-normalize vectors to make inner product equal to cosine similarity
        norms = np.linalg.norm(self.song_vectors, axis=1, keepdims=True)
        # Avoid division by zero
        norms[norms == 0] = 1.0
        normalized_vectors = self.song_vectors / norms
        
        if self.faiss_available:
            try:
                import faiss
                # Use Inner Product (IP) index for cosine similarity search
                self.index = faiss.IndexFlatIP(self.dimension)
                self.index.add(normalized_vectors)
                self.index_type = "faiss_index_flat_ip"
                logger.info(f"DMI: Built FAISS FlatIP index with {len(self.song_ids)} items.")
                return
            except Exception as e:
                logger.error(f"DMI: Failed to build FAISS index: {e}. Falling back to NumPy.")
                
        self.index = None
        self.index_type = "numpy_cosine"
        logger.info(f"DMI: Built NumPy fallback similarity index with {len(self.song_ids)} items.")

    def query(self, query_vector, k=10):
        """
        Queries the top k nearest songs matching the query_vector.
        Returns:
            list of tuple (song_id, similarity_score)
        """
        if len(self.song_ids) == 0:
            return []
            
        q_vec = np.array(query_vector, dtype='float32').reshape(1, -1)
        # Normalize query vector
        q_norm = np.linalg.norm(q_vec)
        if q_norm > 0:
            q_vec = q_vec / q_norm

        k = min(k, len(self.song_ids))

        if self.faiss_available and self.index is not None:
            try:
                scores, indices = self.index.search(q_vec, k)
                results = []
                for score, idx in zip(scores[0], indices[0]):
                    if idx >= 0 and idx < len(self.song_ids):
                        results.append((self.song_ids[idx], float(score)))
                return results
            except Exception as e:
                logger.error(f"DMI: FAISS query error: {e}. Falling back to NumPy search.")

        # NumPy Cosine Similarity Fallback Search
        # song_vectors are shape (N, D), q_vec is (1, D)
        # Cosine similarity is dot product of normalized vectors
        norms = np.linalg.norm(self.song_vectors, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        norm_songs = self.song_vectors / norms
        
        # Calculate dot product
        similarities = np.dot(norm_songs, q_vec.T).flatten()
        top_indices = np.argsort(similarities)[::-1][:k]
        
        results = []
        for idx in top_indices:
            results.append((self.song_ids[idx], float(similarities[idx])))
        return results

# Global Vector Database instance
vector_db = FAISSVectorDB(dimension=EMBEDDING_DIM)

def train_foundation_model():
    """
    Trains the Personalized Foundation Model joint embeddings.
    Fills interaction matrix, performs SVD, runs PCA projection,
    and updates the active FAISS/NumPy Vector Database index.
    """
    try:
        logger.info("DMI: Initializing Personalized Foundation Model training...")
        
        # 1. Fetch DB elements
        songs = Song.query.all()
        users = User.query.all()
        
        if not songs or not users:
            logger.warning("DMI: Cannot train foundation model: missing Songs or Users in database.")
            return False
            
        song_id_to_idx = {song.id: idx for idx, song in enumerate(songs)}
        song_idx_to_id = {idx: song.id for idx, song in enumerate(songs)}
        
        user_id_to_idx = {user.id: idx for idx, user in enumerate(users)}
        
        N_songs = len(songs)
        N_users = len(users)
        
        # Row dimensions: Users + Emotions (7) + Activities (5)
        # Matrix size: (N_users + 12) rows x N_songs columns
        N_rows = N_users + len(EMOTIONS_LIST) + len(ACTIVITIES_LIST)
        
        # Initialize sparse-like dense interaction matrix
        A = np.zeros((N_rows, N_songs), dtype='float32')
        
        # A. Fill Emotion virtual rows co-occurrence links
        # Songs of emotion E get weight in row E
        for song in songs:
            s_mood = song.mood.lower() if song.mood else 'neutral'
            for e_idx, emo in enumerate(EMOTIONS_LIST):
                if emo == s_mood:
                    A[N_users + e_idx, song_id_to_idx[song.id]] = 2.5
                    
        # B. Fill Activity virtual rows
        # Activities link to songs of matching target emotions
        for a_idx, act in enumerate(ACTIVITIES_LIST):
            target_moods = ACTIVITY_MOOD_MAP.get(act, ['neutral'])
            row_idx = N_users + len(EMOTIONS_LIST) + a_idx
            for song in songs:
                s_mood = song.mood.lower() if song.mood else 'neutral'
                if s_mood in target_moods:
                    A[row_idx, song_id_to_idx[song.id]] = 2.0
                    
        # C. Fill User interactions (History)
        history = History.query.all()
        for h in history:
            if h.user_id in user_id_to_idx and h.song_id in song_id_to_idx:
                u_row = user_id_to_idx[h.user_id]
                s_col = song_id_to_idx[h.song_id]
                A[u_row, s_col] += 1.0  # +1.0 for each play
                
        # D. Fill User favorites
        favorites = Favorite.query.all()
        for f in favorites:
            if f.user_id in user_id_to_idx and f.song_id in song_id_to_idx:
                u_row = user_id_to_idx[f.user_id]
                s_col = song_id_to_idx[f.song_id]
                A[u_row, s_col] += 3.0  # +3.0 weight for favorites
                
        # 2. Run Truncated SVD to fit joint space
        # D = EMBEDDING_DIM. SVD cannot have components > min(N_rows, N_songs)
        max_components = min(N_rows, N_songs)
        dim = min(EMBEDDING_DIM, max_components - 1)
        if dim < 2:
            dim = 2
            
        svd = TruncatedSVD(n_components=dim, random_state=42)
        
        # Fit-transform matrix A
        # svd.transform(A) gives U * Sigma (row embeddings) (shape: M x D)
        # svd.components_ gives V^T (transpose of song embeddings) (shape: D x N)
        row_embeds = svd.fit_transform(A)
        song_embeds = svd.components_.T  # (shape: N x D)
        
        # Set dynamic dimension based on SVD results
        dim = song_embeds.shape[1]
        
        # Normalize SVD vectors
        def norm_vecs(arr):
            n = np.linalg.norm(arr, axis=1, keepdims=True)
            n[n == 0] = 1.0
            return arr / n

        row_embeds_norm = norm_vecs(row_embeds)
        song_embeds_norm = norm_vecs(song_embeds)
        
        # Separate row embeddings back
        user_embeds = row_embeds_norm[:N_users]
        emotion_embeds = row_embeds_norm[N_users : N_users + len(EMOTIONS_LIST)]
        activity_embeds = row_embeds_norm[N_users + len(EMOTIONS_LIST):]
        
        # 3. Fit PCA(2) to project all embeddings to 2D coordinates for canvas visualization
        # Combine all normalized vectors
        all_vectors = np.vstack([song_embeds_norm, user_embeds, emotion_embeds, activity_embeds])
        pca = PCA(n_components=2, random_state=42)
        all_coords_2d = pca.fit_transform(all_vectors)
        
        # Separate 2D coordinates
        song_coords = all_coords_2d[:N_songs]
        user_coords = all_coords_2d[N_songs : N_songs + N_users]
        emotion_coords = all_coords_2d[N_songs + N_users : N_songs + N_users + len(EMOTIONS_LIST)]
        activity_coords = all_coords_2d[N_songs + N_users + len(EMOTIONS_LIST):]
        
        # 4. Save pickle database
        payload = {
            'dimension': dim,
            'song_ids': [song_idx_to_id[i] for i in range(N_songs)],
            'song_embeddings': song_embeds_norm,
            'song_coords': song_coords,
            
            'user_ids': list(user_id_to_idx.keys()),
            'user_embeddings': user_embeds,
            'user_coords': user_coords,
            
            'emotions': EMOTIONS_LIST,
            'emotion_embeddings': emotion_embeds,
            'emotion_coords': emotion_coords,
            
            'activities': ACTIVITIES_LIST,
            'activity_embeddings': activity_embeds,
            'activity_coords': activity_coords,
            
            'pca_components': pca.components_,
            'pca_mean': pca.mean_
        }
        
        # Ensure instance folder exists
        os.makedirs(os.path.dirname(EMBEDDINGS_FILE), exist_ok=True)
        with open(EMBEDDINGS_FILE, 'wb') as f:
            pickle.dump(payload, f)
            
        # 5. Rebuild Vector Database Index
        vector_db.rebuild_index(payload['song_ids'], payload['song_embeddings'])
        
        logger.info("DMI: Personalized Foundation Model successfully trained.")
        return True
        
    except Exception as e:
        logger.error(f"DMI: Failed to train foundation model: {e}", exc_info=True)
        return False

def load_foundation_model():
    """
    Loads pretrained SVD embeddings from file and indexes them in FAISS.
    Returns:
        dict: payload if loaded, None otherwise
    """
    if not os.path.exists(EMBEDDINGS_FILE):
        logger.info("DMI: No pretrained foundation model found. Running cold startup training...")
        success = train_foundation_model()
        if not success:
            return None
            
    try:
        with open(EMBEDDINGS_FILE, 'rb') as f:
            payload = pickle.load(f)
            
        vector_db.rebuild_index(payload['song_ids'], payload['song_embeddings'])
        return payload
    except Exception as e:
        logger.error(f"DMI: Failed to load foundation model embeddings: {e}")
        return None

def get_dynamic_user_vector(user_id, current_emotion=None, selected_activity=None, model_data=None):
    """
    Calculates the dynamic run-time user embedding vector by combining:
    1. Static user taste baseline vector.
    2. Active session plays context vector.
    3. Active emotion vector.
    4. Selected activity override vector.
    """
    if model_data is None:
        model_data = load_foundation_model()
        
    if model_data is None:
        return np.zeros(EMBEDDING_DIM, dtype='float32')

    dim = model_data['dimension']
    
    # 1. Base User vector
    u_vector = None
    if user_id in model_data['user_ids']:
        u_idx = model_data['user_ids'].index(user_id)
        u_vector = model_data['user_embeddings'][u_idx]
    else:
        # User cold-start baseline: mean of all users or zero vector
        if len(model_data['user_embeddings']) > 0:
            u_vector = np.mean(model_data['user_embeddings'], axis=0)
        else:
            u_vector = np.zeros(dim, dtype='float32')
            
    # 2. Session Context vector
    # Average embeddings of songs played in the last 1 hour
    session_vector = np.zeros(dim, dtype='float32')
    from utils.mood_intelligence import get_active_session_features
    # We fetch song IDs played in the active session
    history = History.query.filter_by(user_id=user_id).order_by(History.timestamp.desc()).limit(20).all()
    if history:
        # Filter songs that belong to the active session (gap < 1 hr)
        session_songs = [history[0]]
        for i in range(1, len(history)):
            gap = (history[i-1].timestamp - history[i].timestamp).total_seconds() / 3600.0
            if gap < 1.0:
                session_songs.append(history[i])
            else:
                break
                
        song_vectors = []
        for h in session_songs:
            if h.song_id in model_data['song_ids']:
                s_idx = model_data['song_ids'].index(h.song_id)
                song_vectors.append(model_data['song_embeddings'][s_idx])
                
        if song_vectors:
            session_vector = np.mean(song_vectors, axis=0)

    # 3. Current Emotion vector
    emotion_vector = np.zeros(dim, dtype='float32')
    if current_emotion:
        emo_clean = current_emotion.lower()
        if emo_clean in model_data['emotions']:
            e_idx = model_data['emotions'].index(emo_clean)
            emotion_vector = model_data['emotion_embeddings'][e_idx]

    # 4. Selected Activity vector
    activity_vector = np.zeros(dim, dtype='float32')
    if selected_activity:
        act_clean = selected_activity.lower()
        if act_clean in model_data['activities']:
            a_idx = model_data['activities'].index(act_clean)
            activity_vector = model_data['activity_embeddings'][a_idx]
            
    # Combine vectors using weights
    # If activity is selected, it gets higher bias to redirect search
    w_base = 0.35
    w_session = 0.15
    w_emotion = 0.25
    w_activity = 0.25 if selected_activity else 0.0
    
    # Recalibrate base weight if no activity selected
    if w_activity == 0.0:
        w_base = 0.5
        w_emotion = 0.35
        
    combined = (w_base * u_vector + 
                w_session * session_vector + 
                w_emotion * emotion_vector + 
                w_activity * activity_vector)
                
    # Normalize combined vector
    norm = np.linalg.norm(combined)
    if norm > 0:
        combined = combined / norm
        
    return combined

def project_vector_to_2d(vector, model_data):
    """
    Projects a high-dimensional vector to 2D coordinates using SVD-fitted PCA components.
    Used for projecting the dynamic user pulsar coordinate.
    """
    if 'pca_components' not in model_data or 'pca_mean' not in model_data:
        return np.zeros(2, dtype='float32')
        
    components = model_data['pca_components']
    mean = model_data['pca_mean']
    
    # PCA projection formula: (vector - mean) . components.T
    projected = np.dot(vector - mean, components.T)
    return projected
