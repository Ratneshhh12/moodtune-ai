import os
import re
import requests
import random
import logging

logger = logging.getLogger(__name__)

# Multilingual Emotion Lexicon
# English, Hindi, and Hinglish keywords representing different emotions
EMOTION_LEXICON = {
    'happy': [
        'happy', 'joy', 'smile', 'laugh', 'dance', 'sunshine', 'celebrate', 'celebration', 'party', 'fun', 'light',
        'uplifting', 'glee', 'glad', 'cheerful', 'golden', 'bright', 'music', 'rhythm', 'upbeat', 'high',
        'khush', 'khushi', 'maza', 'masti', 'muskurana', 'muskurahat', 'jhoom', 'nache', 'nacho', 'hasna',
        'hansi', 'dhol', 'shadi', 'celebration', 'yaar', 'dost', 'party', 'milan', 'mast', 'shandar'
    ],
    'sad': [
        'sad', 'cry', 'tear', 'pain', 'sorrow', 'alone', 'lonely', 'dark', 'heartbreak', 'broken', 'hurt', 'grief',
        'rain', 'tears', 'melancholy', 'gloom', 'sigh', 'lost', 'empty', 'weeping', 'shattered',
        'rona', 'aansu', 'dard', 'akele', 'akela', 'akeli', 'tanhai', 'tanha', 'udaas', 'udaasi', 'toot', 'toota',
        'gam', 'ashq', 'khamoshi', 'khamosh', 'judai', 'saza', 'rula', 'tadap', 'mausim', 'zakhm'
    ],
    'angry': [
        'angry', 'rage', 'mad', 'hate', 'fight', 'burn', 'fire', 'scream', 'kill', 'storm', 'blood', 'furious',
        'vengeance', 'flame', 'war', 'battle', 'weapon', 'strike', 'rebel', 'thunder',
        'gussa', 'kranti', 'jung', 'ladai', 'tabahi', 'dushman', 'tod', 'phad', 'chingari', 'shola', 'hungama',
        'nafrat', 'maar', 'katra', 'khoon', 'dhoka', 'daga', 'dushmani', 'aag'
    ],
    'fearful': [
        'fear', 'afraid', 'scared', 'panic', 'dread', 'terror', 'anxious', 'shadow', 'ghost', 'nightmare', 'tremble',
        'scary', 'danger', 'fright', 'worry', 'threat', 'haunted', 'darkness',
        'darr', 'dar', 'ghabrahat', 'ghabra', 'tension', 'andhera', 'khoaf', 'sannata', 'mushkil', 'daravna',
        'raat', 'moth', 'maut', 'khatra', 'musibat'
    ],
    'neutral': [
        'neutral', 'calm', 'peace', 'silent', 'quiet', 'rest', 'sleep', 'relax', 'wind', 'nature', 'ocean', 'river',
        'sky', 'breeze', 'still', 'meditate', 'zen', 'gentle', 'soft', 'whisper',
        'shanti', 'sukun', 'sukoon', 'hawa', 'chup', 'dheere', 'soja', 'neend', 'thanda', 'sabar', 'sabr',
        'beh', 'bahti', 'nadi', 'dhara', 'badal', 'pawan', 'sajda'
    ],
    'surprised': [
        'surprised', 'surprise', 'wonder', 'amaze', 'shock', 'sudden', 'magic', 'miracle', 'extraordinary', 'marvel',
        'dazzle', 'unexpected', 'stunning', 'gasp',
        'ajab', 'gajab', 'ashcharya', 'hairan', 'hairani', 'hairana', 'kamaal', 'jadu', 'karishma', 'shauk',
        'achambha', 'kamaal', 'tazub', 'nayab'
    ],
    'disgusted': [
        'disgust', 'disgusted', 'gross', 'sick', 'ugly', 'dirty', 'rot', 'waste', 'hate', 'bad', 'repulsed',
        'loath', 'filthy', 'shame',
        'nafrat', 'chee', 'ganda', 'gandagi', 'kuda', 'thoo', 'kuda', 'kooda', 'kharab', 'bekar', 'bura'
    ]
}

# Curated lyrics for seeded database songs
CURATED_LYRICS = {
    'custom_hindi_bekhayali': """
Bekhayali mein bhi tera hi khayaal aaye
Kyun judaai mein bhi tera hi khayaal aaye
Kyun behad dil ko tadpati hai
Teri yaadon ki baarishein rulati hain

Kyun behad dil ko tadpati hai
Teri yaadon ki baarishein rulati hain
Gusse ki aag mein jal raha hoon main
Dushmani khud se hi kar raha hoon main
Tu nahi toh yeh tabahi hi sahi
Bekhayali mein bhi tera hi khayaal aaye...
""",
    'custom_hindi_channa_mereya': """
Accha chalta hoon, duaaon mein yaad rakhna
Mere zikr ka zubaan pe swaad rakhna
Dil ke sandookon mein mere acche kaam rakhna
Chitthi taaron mein bhi mera tu salaam rakhna

Andhera tera maine le liya
Mera ujla sitara tere naam kiya
Channa mereya mereya, channa mereya mereya
Channa mereya mereya beliya o piya
O piya... tadpat hai dil mera
Rona aata hai tere bina...
""",
    'custom_hindi_balam_pichkari': """
Balam pichkari jo tune mujhe maari
Toh bole re zamana kharab ho gaya
Holi ke rang mein jhoom raha dil mera
Celebration ka hai yeh shandar nasha

Aise na nacho mere yaar o babua
Masti ka dhol baje re dhang dhang daa
Balam pichkari jo tune mujhe maari
Toh bole re zamana kharab ho gaya
Jeet gaye aaj hum khushi ki jung re
Nache re saara jag hamare hi sang re!
""",
    'custom_hindi_kun_faya_kun': """
Kun faya kun, kun faya kun, faya kun
Sajda savera mera tan barse
Dil ke andhere ko door kar de maula
Sukun de, sukoon de mere pareshan mann ko

Darr lagta hai is duniya se mujhe
Apne shanti ki chaadar mein chhupa le mujhe
Jab kahin pe kuch nahi tha, wahi tha wahi tha
Kun faya kun, kun faya kun...
""",
    'custom_hindi_295': """
Nibhne ni yitthe bandeya chahwan chahwan ch
295 lag gayi ae sach bolan de rahan ch
Gussa bathera par bolna ni aunda
Dushman khada moore, honsla ni dhanda

Tod de jinde jo rokde ne raahwan nu
Jung hai sach di, aag lagne de saahwan nu
Khoon kharaba te tabahi har thaan
295 lag gayi ae mureedan de naan!
"""
}

# Procedural Lyric Templates based on mood to act as realistic fallbacks
MOOD_LYRIC_TEMPLATES = {
    'happy': [
        "Sunlight streaming through my window today\nAll my doubts are dancing away\nGot the rhythm in my feet, got the music in my soul\nWe're throwing a party, losing all control!\n\nKhushiyon ka mausam aaya hai yaar\nMasti mein jhoomein saara sansar\nNachein gayein, dhol bajayein aaj\nZabardast hai yeh masti ka raaj!",
        "Every single heartbeat is sounding so bright\nWalking on clouds in the golden light\nWith a smile on my face and joy in my hand\nWe're singing along to the best in the land\n\nMuskurata hua yeh naya savera\nDoor ho gaya hai andhere ka ghera\nKhushi ki lehar mein behne do mujhe\nJhoomein nachein gaayein milke sabhi!"
    ],
    'sad': [
        "Tears are falling like the cold summer rain\nEvery memory is a shadow of pain\nLeft all alone in this empty dark room\nWith a broken heart waiting for the flowers to bloom\n\nDil toot gaya, ab dard hi dard hai yaara\nTanhai mein rota hai yeh mann bechara\nAansuon ki baarishein rukti nahi\nKyun judai ki yeh raat dhalti nahi...",
        "Walking down this lonely, silent street\nOnly the echo of my own heartbeat\nLost in the silence of what used to be\nNothing but sorrow is left here for me\n\nGam ka yeh andhera dhalta hi nahi\nKoi apna ab mujhse milta hi nahi\nAkela hoon main, akeli hai raat\nKaise bhulaoon teri meethi si baat..."
    ],
    'angry': [
        "Fire is burning deep down in my chest\nFurious storm that will never let me rest\nFight back the hate, strike down the war\nWe are screaming at the top, opening the door!\n\nGusse ki aag bhadak rahi hai seene mein\nKranti ka hungama hai har ek jeene mein\nTod do zanjeerein, dushman ko bata do\nApni taaqat se tabahi macha do!",
        "Rage in the blood, thunder in the sky\nSick of the lies, not gonna ask why\nBattle lines are drawn, bullet in the air\nWe're striking back hard, showing we don't care\n\nJung ka shola ab bhadak chuka hai\nDushman ka darr ab nikal chuka hai\nNafrat ki aag mein sab jal jayega\nKranti ka hungama naya daur layega!"
    ],
    'neutral': [
        "Silent river flowing soft to the sea\nCalm gentle breeze in the shade of the tree\nWhispering winds in the infinite sky\nJust letting the quiet moments pass us by\n\nSukun mila hai is dil ko yahan\nShanti se beh raha hai saara jahaan\nHawa ke jhokon mein sukoon ka saaz hai\nDheere dheere behti pawan ki aawaz hai...",
        "Close your eyes, let the thoughts drift away\nQuietly resting at the end of the day\nStillness of water, deep calm of the mind\nPeace is the only thing we want to find\n\nSukun ka ek pal, sabr ki ek baat\nChup chaap guzarne do yeh thandi si raat\nSajda kiya hai us khuda ke aage\nMann ki saari shanti ab yahan jaage..."
    ],
    'fearful': [
        "Anxious whispers in the middle of the night\nScared of the shadows, looking for the light\nTrembling hands in the cold and the dread\nHaunted by the ghosts of what lies ahead\n\nDarr lagta hai is ghane andhere se\nKaise milunga kal ke savere se\nGhobrahahat hoti hai dil mein har pal\nKya hoga aane wale mushkil kal...",
        "Danger is lurking in the silence so deep\nTerror is waking when I try to sleep\nLost in the nightmare, panic in the air\nAnxiety is catching me everywhere\n\nKhoaf ka sannata faila hai har taraf\nMusibat aayi hai dil ke har taraf\nTension ki chadar mein lipta hai mann\nDarr lagta hai dekh kar yeh sunsan gann..."
    ],
    'surprised': [
        "A sudden flash, a magical surprise\nStunning wonder opening my eyes\nAjab khel hai is duniya ka saara\nKarishma dikhata hai har ek tara\n\nHairan hoon main dekh kar yeh kamaal\nJadu sa chha gaya hai be-misaal\nNayab hai yeh pal, anokha hai samaa\nKarishma hua hai dekh saara jahaan!",
        "Unexpected miracle in the middle of the day\nDazzling lights washing doubts away\nWow, what a surprise, what a magic spark\nA stunning flash lighting up the dark\n\nTazub hai mujhe is naye rang par\nJadu sa chal gaya mere ang ang par\nAchambha hua hai dekh kar yeh karishma aaj\nAjab gajab khuda ka hai yeh saara raaj!"
    ],
    'disgusted': [
        "Ugly waste rotting on the dirty ground\nSick of the filth that is lying around\nRepulsed by the shame and the dirty lies\nNothing but disgust in everyone's eyes\n\nNafrat hai mujhe is gandagi se\nChee, kaisa bekar hal hai zindagi se\nGanda hai yeh saara kuda kachra yahan\nThoo, bekar ho gaya hai saara jahaan...",
        "Filthy whispers in the air we breathe\nRotting thoughts that lie underneath\nGross lies and shame make me turn away\nNothing but dirt at the end of the day\n\nKharab hai dimaag, bekar hai yeh baatein\nGande logo ki gandi hai raatein\nNafrat hai mujhe dekh kar yeh haal\nChee, bekar ho gaya saara jaal..."
    ]
}

def fetch_lyrics(title, artist):
    """
    Fetch lyrics from lyrics.ovh API.
    Falls back to curated dictionary for seeded songs, or returns None.
    """
    # 1. Check curated lyrics first
    # Clean the title and artist for matching keys
    t_clean = re.sub(r'[^a-zA-Z0-9]', '_', title.lower())
    a_clean = re.sub(r'[^a-zA-Z0-9]', '_', artist.lower())

    for key, lyrics in CURATED_LYRICS.items():
        if key in t_clean or t_clean in key or (('bekhayali' in t_clean) and key == 'custom_hindi_bekhayali'):
            return lyrics.strip()
            
    # 2. Try the public lyrics API (lyrics.ovh)
    try:
        url = f"https://api.lyrics.ovh/v1/{artist}/{title}"
        response = requests.get(url, timeout=3.5)
        if response.status_code == 200:
            lyrics = response.json().get('lyrics', '')
            if lyrics:
                # API sometimes prepends credit text
                return lyrics.strip()
    except Exception as e:
        logger.warning(f"Failed to fetch from lyrics.ovh: {e}")
        
    return None

def generate_fallback_lyrics(title, artist, mood='neutral'):
    """Generate realistic placeholder lyrics matching a mood if API fails"""
    mood = mood.lower() if mood else 'neutral'
    if mood not in MOOD_LYRIC_TEMPLATES:
        mood = 'neutral'
        
    # Pick a random template and format it
    template = random.choice(MOOD_LYRIC_TEMPLATES[mood])
    header = f"[{title} - Lyrics Analyzed by MoodTune AI]\n[Artist: {artist}]\n[Mood: {mood.capitalize()}]\n\n"
    return header + template

def analyze_lyrics_emotion(lyrics, db_mood='neutral'):
    """
    NLP Sentiment and Emotion Analyzer using a multilingual Lexicon.
    Analyzes lyrics text and returns breakdown percentages and dominant emotion.
    """
    if not lyrics:
        return 'neutral', {m: 0.0 for m in EMOTION_LEXICON.keys()}

    # Clean and tokenize lyrics text
    text_lower = lyrics.lower()
    words = re.findall(r'\b\w+\b', text_lower)
    total_words = len(words)

    if total_words == 0:
        return db_mood, {m: 0.0 for m in EMOTION_LEXICON.keys()}

    # Count matching keyword frequencies per emotion
    scores = {emotion: 0 for emotion in EMOTION_LEXICON.keys()}
    for emotion, keywords in EMOTION_LEXICON.items():
        # Match each keyword as whole words
        for kw in keywords:
            # We match by searching word count
            count = len(re.findall(r'\b' + re.escape(kw) + r'\b', text_lower))
            scores[emotion] += count

    total_hits = sum(scores.values())

    # Calculate percentages
    if total_hits > 0:
        percentages = {emo: (count / total_hits) * 100 for emo, count in scores.items()}
        dominant_emotion = max(percentages, key=percentages.get)
    else:
        # Fallback to DB mood if no keywords matched
        db_mood = db_mood.lower() if db_mood else 'neutral'
        if db_mood not in EMOTION_LEXICON.keys():
            db_mood = 'neutral'
        percentages = {emo: 0.0 for emo in EMOTION_LEXICON.keys()}
        percentages[db_mood] = 100.0
        dominant_emotion = db_mood

    return dominant_emotion, percentages

def get_emotion_compatibility(song_mood, user_emotion):
    """
    Calculate emotional compatibility score between song sentiment and user mood.
    Returns a score (0-100) and matching description text.
    """
    if not user_emotion or user_emotion.lower() in ['unknown', '']:
        return {
            'match_score': 80,
            'description': "Ready to match! Scan your mood to check emotional alignment."
        }

    song_mood = song_mood.lower()
    user_emotion = user_emotion.lower()

    # Exact matches
    if song_mood == user_emotion:
        score = random.randint(91, 98)
        return {
            'match_score': score,
            'description': f"Perfect emotional resonance! Both you and this song are feeling {song_mood}. A direct reflection of your state."
        }

    # High compatibility pairings
    compatibility_matrix = {
        ('happy', 'surprised'): (86, "High synergy! The exciting, surprising vibes of the song match your happy mood."),
        ('surprised', 'happy'): (84, "High synergy! The happy, upbeat vibes of the song match your surprised state."),
        ('sad', 'fearful'): (76, "Deep resonance. The introspective, heavy nature of the song matches your sensitive state."),
        ('fearful', 'sad'): (74, "Deep resonance. The melancholy, deep nature of the song matches your anxious state."),
        ('angry', 'sad'): (70, "Cathartic match. Channeling emotional depth can help process frustration and let it out."),
        ('sad', 'angry'): (68, "Cathartic match. Listening to deep, somber tones can help soothe a frustrated mind."),
        ('neutral', 'happy'): (78, "Relaxed match. This uplifting song adds a pleasant energy to your calm state."),
        ('neutral', 'sad'): (72, "Relaxed match. An emotional ballad blends smoothly with your calm, quiet state."),
        ('neutral', 'angry'): (60, "Contrast match. The song's intensity might energize your calm baseline."),
        ('neutral', 'fearful'): (65, "Mild resonance. Gentle meditative sounds fit your anxious state."),
        ('neutral', 'surprised'): (75, "Exciting match. A surprise twist adds excitement to your calm day."),
        ('neutral', 'disgusted'): (55, "Balanced match. A neutral track helps reset a disgusted or annoyed feeling."),
        ('happy', 'sad'): (45, "Contrast vibe. The song's happy tone contrasts with your sad state, which might help lift your spirits."),
        ('sad', 'happy'): (40, "Contrast vibe. A melancholy track during a happy moment offers a peaceful, reflective pause."),
        ('angry', 'happy'): (35, "Contrast vibe. Upbeat, happy tracks can help defuse anger and stress."),
        ('happy', 'angry'): (38, "Contrast vibe. High-tempo pop rhythms can redirect angry energy into movement.")
    }

    pair = (song_mood, user_emotion)
    if pair in compatibility_matrix:
        score, desc = compatibility_matrix[pair]
        return {
            'match_score': score,
            'description': desc
        }

    # Fallback/General match score for neutral user
    if user_emotion == 'neutral':
        score = random.randint(70, 78)
        return {
            'match_score': score,
            'description': f"Balanced alignment. This {song_mood} song fits smoothly into your calm, neutral state."
        }

    # Default fallback
    score = random.randint(50, 62)
    return {
        'match_score': score,
        'description': f"Eclectic match. A unique blend of {song_mood} song sentiment and your {user_emotion} state."
    }

def get_lyrics_and_analysis(title, artist, user_emotion=None):
    """
    Main controller to fetch lyrics, run sentiment analysis,
    and match it with user facial emotion.
    """
    # 1. Fetch lyrics
    lyrics = fetch_lyrics(title, artist)
    is_fallback = False
    
    if not lyrics:
        # Determine fallback mood
        fallback_mood = 'neutral'
        try:
            from models.song import Song
            song = Song.query.filter_by(title=title, artist=artist).first()
            if song:
                fallback_mood = song.mood
        except Exception:
            pass
        lyrics = generate_fallback_lyrics(title, artist, fallback_mood)
        is_fallback = True

    # 2. Analyze emotion
    # Query database to check if we already have a mood tag for this song
    db_mood = 'neutral'
    try:
        from models.song import Song
        song = Song.query.filter_by(title=title, artist=artist).first()
        if song:
            db_mood = song.mood
    except Exception:
        pass
        
    dominant_emotion, emotion_scores = analyze_lyrics_emotion(lyrics, db_mood)

    # 3. Match with user emotion
    match_results = get_emotion_compatibility(dominant_emotion, user_emotion)

    return {
        'title': title,
        'artist': artist,
        'lyrics': lyrics,
        'lyrics_emotion': dominant_emotion,
        'emotion_scores': emotion_scores,
        'is_fallback_lyrics': is_fallback,
        'match_results': match_results
    }
