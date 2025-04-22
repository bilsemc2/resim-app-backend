// server.js
require('dotenv').config(); // .env dosyasındaki değişkenleri yükler (API KEY vb.)
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // AI API çağrıları için

const app = express();
const PORT = process.env.PORT || 5001; // .env'deki portu veya varsayılanı kullan

app.use(cors({
  origin: [
    'http://localhost:5173', // Vite (React) local portu
    'http://localhost:3000', // Gerekirse eski portu da bırakabilirsiniz
    'https://bilsemc2-gorsel-sanatlar.netlify.app' // Netlify canlı adresin
  ],
  credentials: true
}));

// Gelen JSON verilerini ayrıştırmak için
app.use(express.json({ limit: '10mb' })); // Resimleri base64 olarak alacaksak limiti artıralım
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// --- Basit Kelime Listesi (Veritabanı yerine) ---
const wordList = [
  'Macera', 'Okyanus', 'Fısıltı', 'Kristal', 'Gölge', 'Melankoli', 'Harabe', 'Gelecek', 'Robot', 'Rüya',
  'Labirent', 'Umut', 'Gizem', 'Galaksi', 'Şehir', 'Sessizlik', 'Dans', 'Ateş', 'Buz', 'Zaman', 'Işık',
  'Ayna', 'Maske', 'Anahtar', 'Kitap', 'Müzik', 'Saat', 'Köprü', 'Yolculuk', 'Dağ', 'Saman', 'Merdiven', 'Kapalı'
];

// --- API Rotaları (Endpoints) ---

// 1. Test Rotası
app.get('/', (req, res) => {
  res.send('AI Sanat Atölyesi Backend Çalışıyor!');
});

// 2. Rastgele Kelime Rotası
app.get('/api/random-words', (req, res) => {
  try {
    const shuffled = wordList.sort(() => 0.5 - Math.random()); // Listeyi karıştır
    const selectedWords = shuffled.slice(0, 3); // İlk 3 kelimeyi seç
    res.json({ words: selectedWords });
  } catch (error) {
    console.error("Kelime seçme hatası:", error);
    res.status(500).json({ message: 'Kelimeler getirilirken bir hata oluştu.' });
  }
});

// 3. Rastgele Resim Rotası (Picsum kullanarak)
app.get('/api/random-image', (req, res) => {
  try {
    // Picsum.photos belirli bir boyut için rastgele resim URL'si sağlar
    const width = 600;
    const height = 400;
    // Cache'i engellemek için rastgele bir ID ekleyebiliriz
    const imageUrl = `https://picsum.photos/seed/${Date.now()}/${width}/${height}`;
    res.json({ imageUrl: imageUrl });
  } catch (error) {
    console.error("Resim URL'si alma hatası:", error);
    res.status(500).json({ message: 'Referans resim getirilirken bir hata oluştu.' });
  }
});

// --- Yapay Zeka Değerlendirme Rotaları (Bir Sonraki Adımda Doldurulacak) ---

// 4. Kelime Bazlı Çizim Değerlendirme Rotası
app.post('/api/evaluate/word-prompt', async (req, res) => {
  console.log("Word Prompt Eval Request Body:", req.body); // Gelen veriyi logla
  const { image, promptWords } = req.body; // Frontend'den base64 image ve kelimeler bekleniyor

  if (!image || !promptWords || !Array.isArray(promptWords) || promptWords.length !== 3) {
    return res.status(400).json({ message: 'Eksik veya hatalı veri: image (base64) ve promptWords (3 elemanlı dizi) gereklidir.' });
  }

  // ------ YAPAY ZEKA ENTEGRASYONU BURAYA GELECEK ------
  // 1. OpenAI veya başka bir AI API'sine istek yapacak kodu yazın.
  // 2. image (base64) ve promptWords'ü AI'a gönderin.
  // 3. AI'dan gelen cevabı işleyin (parse edin).
  // 4. İşlenmiş değerlendirme sonucunu frontend'e gönderin.

  console.log("AI Değerlendirme (Word Prompt) - Başlatılıyor...");
  try {
    // ÖRNEK: OpenAI API Çağrısı (GPT-4 Vision varsayımıyla)
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
       throw new Error("OpenAI API Anahtarı bulunamadı.");
    }

    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions', // Correct endpoint for Chat models
        {
            model: 'gpt-4o', // veya uygun vision modeli
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `Bir sanat öğretmeni gibi davranarak, yüklenen şu çizimi değerlendir: Değerlendirme kriterleri Kompozisyon, Çizgi kullanımı, Perspektif, Oran-Orantı ve Yaratıcılık olmalı. Çizimin ilham aldığı kelimeler şunlardır: ${promptWords.join(', ')}. Lütfen her kriter için kısa ve yapıcı bir yorum yap. Cevabını sadece JSON formatında, şu anahtarlarla ver: kompozisyon, cizgi, perspektif, oranOranti, yaraticilik.` },
                        {
                            type: 'image_url',
                            image_url: {
                                url: image, // Frontend'den gelen base64 data URI
                                detail: "low" // "high" veya "low" seçilebilir (maliyeti etkiler)
                            },
                        },
                    ],
                },
            ],
            max_tokens: 300, // Cevap uzunluğunu sınırla
            // response_format: { type: "json_object" } // GPT-4 Turbo ve sonrası için JSON modu
        },
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        }
    );

    console.log("OpenAI Response:", response.data.choices[0].message.content);

    // OpenAI'dan gelen cevabı parse etmeye çalış
    let evaluationResult;
    try {
       // JSON formatında cevap bekliyoruz
       const rawContent = response.data.choices[0].message.content;
       // Bazen AI ```json ... ``` bloğu içine alabilir, onu temizleyelim
       const jsonString = rawContent.replace(/```json\n?|\n?```/g, '').trim();
       evaluationResult = JSON.parse(jsonString);
    } catch (parseError) {
       console.error("OpenAI cevabı JSON parse edilemedi:", parseError);
       console.error("Ham cevap:", response.data.choices[0].message.content);
       // Eğer parse edilemezse, ham metni bir 'genelYorum' olarak gönderelim
       evaluationResult = { genelYorum: response.data.choices[0].message.content || "AI'dan geçerli bir değerlendirme alınamadı." };
    }


    res.json({ evaluation: evaluationResult });

  } catch (error) {
    console.error('OpenAI API Hatası (Word Prompt):', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Yapay zeka değerlendirmesi sırasında bir hata oluştu.' });
  }
  // ------ YAPAY ZEKA ENTEGRASYONU SONU ------

});

// 5. Resim Kopyalama Değerlendirme Rotası
app.post('/api/evaluate/image-replication', async (req, res) => {
  console.log("Image Replication Eval Request Body:", req.body);
  const { userImage, referenceImageInfo } = req.body; // userImage (base64), referenceImageInfo (URL olabilir)

   if (!userImage || !referenceImageInfo) {
    return res.status(400).json({ message: 'Eksik veri: userImage (base64) ve referenceImageInfo gereklidir.' });
  }

  // ------ YAPAY ZEKA ENTEGRASYONU BURAYA GELECEK ------
  // 1. OpenAI (GPT-4 Vision) veya benzeri bir modele istek yap.
  // 2. userImage (base64) ve referenceImageInfo'yu (URL) AI'a gönder.
  // 3. AI'dan iki resmi karşılaştırmasını ve Çizgi, Perspektif, Oran-Orantı, Benzerlik kriterlerine göre değerlendirmesini iste.
  // 4. Gelen cevabı işleyip frontend'e gönder.

  console.log("AI Değerlendirme (Image Replication) - Başlatılıyor...");
  try {
    const apiKey = process.env.OPENAI_API_KEY;
     if (!apiKey) {
       throw new Error("OpenAI API Anahtarı bulunamadı.");
    }

    const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
            model: 'gpt-4o',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `Bir sanat öğretmeni gibi davranarak, yüklenen şu iki resmi karşılaştır. İlk resim kullanıcının çizimi, ikinci resim ise referans alınan orijinal resimdir. Kullanıcının çizimini, referans resme göre Çizgi kullanımı, Perspektif aktarımı, Oran-Orantı tutarlılığı ve Genel Benzerlik kriterleri çerçevesinde değerlendir. Lütfen her kriter için kısa ve yapıcı bir yorum yap. Cevabını sadece JSON formatında, şu anahtarlarla ver: cizgi, perspektif, oranOranti, benzerlik.` },
                        { type: 'image_url', image_url: { url: userImage, detail: "low" } }, // Kullanıcının çizimi (base64)
                        { type: 'image_url', image_url: { url: referenceImageInfo, detail: "low" } }, // Referans resim (URL)
                    ],
                },
            ],
            max_tokens: 300,
             // response_format: { type: "json_object" } // JSON modu
        },
        {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        }
    );

     console.log("OpenAI Response:", response.data.choices[0].message.content);

     // OpenAI'dan gelen cevabı parse etmeye çalış
    let evaluationResult;
    try {
       // JSON formatında cevap bekliyoruz
       const rawContent = response.data.choices[0].message.content;
       const jsonString = rawContent.replace(/```json\n?|\n?```/g, '').trim();
       evaluationResult = JSON.parse(jsonString);
    } catch (parseError) {
       console.error("OpenAI cevabı JSON parse edilemedi:", parseError);
       console.error("Ham cevap:", response.data.choices[0].message.content);
       evaluationResult = { genelYorum: response.data.choices[0].message.content || "AI'dan geçerli bir değerlendirme alınamadı." };
    }

    res.json({ evaluation: evaluationResult });

  } catch (error) {
    console.error('OpenAI API Hatası (Image Replication):', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Yapay zeka değerlendirmesi sırasında bir hata oluştu.' });
  }
  // ------ YAPAY ZEKA ENTEGRASYONU SONU ------
});

// --- Sunucuyu Başlatma ---
app.listen(PORT, () => {
  console.log(`Backend sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
});