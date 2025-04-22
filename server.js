// server.js
require('dotenv').config(); // .env dosyasındaki değişkenleri yükler (API KEY vb.)
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // AI API çağrıları için
const storyFragments = require('./storyFragments'); // Eksik hikaye örnekleri

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


// --- API Rotaları (Endpoints) ---

// 1. Test Rotası
app.get('/', (req, res) => {
  res.send('AI Sanat Atölyesi Backend Çalışıyor!');
});

// 2. Rastgele Kelime Rotası (AI destekli)
app.get('/api/random-words', async (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  // Statik fallback listesi
  try {
    if (!apiKey) throw new Error('OpenAI API anahtarı yok.');
    const prompt = 'İlkokul öğrencilerinin kolayca çizebileceği 3 tane basit, somut, Türkçe kelime üret. Sadece kelimeleri virgülle ayırarak ver. Örnek: Elma, Balık, Ev';
    const aiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Sen bir ilkokul öğretmenisin.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 20,
        temperature: 1.2
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    let words = aiRes.data.choices[0]?.message?.content?.trim();
    words = words.replace(/^```[a-z]*\n?|\n?```$/g, '').replace(/^"|"$/g, '').trim();
    // Sadece kelimeler kalsın
    if (words.includes(':')) words = words.split(':').pop();
    const wordArr = words.split(',').map(w => w.trim()).filter(Boolean);
    // 3 geçerli kelime yoksa hata dön
    if (wordArr.length !== 3 || wordArr.some(w => w.length < 2)) throw new Error('AI kelime üretimi başarısız: ' + words);
    console.log('AI ile üretilen kelimeler:', wordArr);
    return res.json({ words: wordArr });
  } catch (error) {
    console.error('AI kelime üretimi başarısız:', error.message);
    res.status(500).json({ message: 'Yapay zeka kelime üretimi başarısız: ' + error.message });
  }
});

// Eksik Hikaye API'sı (Yapay Zeka ile Dinamik)
app.get('/api/incomplete-story', async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: 'OpenAI API anahtarı bulunamadı.' });
    }

    const prompt = `İlkokul seviyesinde, tamamlanmayı bekleyen kısa bir hikaye üret. Hikayede ana karakter olarak aşağıdaki Türk ve Anadolu kültürüne özgü isimlerden birini rastgele seç ve kullan:
Alp, Kutlu, Tegin, Bars, İlter, Arslan, Kara, Tunga, Yıldırım, Börü, Bağatur, Bilge, Çağrı, Kül Tigin, Sancar, Karaoğlan, Temir, Uluğ, Atilla, Çetin, Toygar, Alpagut, Demirhan, Barak, Torgut, Kılıç, Baybars, Taygun, Öksüz, Altay, Timuçin, Altuğ, Barlas, Kutalmış, Selçuk, Çakır, Tuğtekin, Mete, Tolun, Boğaç, Kayra, Göktuğ, Oğuz, Tuncer, Doruk, Korgan, Şahbaz, Umay, Gökhan, Berke, Erkut, Sülemiş, Tunahan, Çavlı, İlkan, Aybars, Araz, Bilgin, Çağatay, Doğan, Erdem, Eren, Evren, Giray, Okan, Onur, Orkun, Talay, Tan, Taylan, Tolga, Uğur, Umut, Yiğit, Ozan, Çelik, Dağhan, Erkutay, Güçlü, İlbey, Özgür, Tankut, Turhan, Yakut, Ulaş, Yaman, Arda, Ergin, Erdemir, c, Güner, Kayı, Ömür, Şamil, Tarkan, Toprak, Tunç, Umran, Ülger, Vural, Yurdakul, Ziya, Aydın, Kutay, Toyka, Ayla, Yıldız, Asena, Suna, Bengü, Çağla, Altun, Ayben, Aybüke, Elif, Işın, Kiraz, Esin, Özlem, Şule, Tomris, Ülkü, Yağmur, Yonca, Zeynep, Alara, Azra, Belgin, Deniz, Derin, Elvin, Fidan, Gül, Hazal, İpek, Jale, Karya, Larissa, Menekşe, Nazlı, Nehir, Özge, Pelin, Rüya, Sedef, Sevgi, Şirin, Tuana, Yasemin, Ela, Esra, Funda, Gizem, Hale, İnci, Lale, Meltem, Nur, Rana, Seher, Tuna, Ümit, Yeliz, Zeliha, Afet, Beril, Cemre, Defne, Elçin, Filiz, Gonca, Hande, İlknur, Kamelya, Miray, Nergis, Papatya, Reyhan, Serap, Şebnem, Zerrin, Arzu, Balım, Burcu, Ceren, Duru, Emel, Feride, Gülben, Harika, Jülide, Kumru, Muazzez, Nazende, Perihan, Rengin, Selin, Tansu, Vuslat, Yaprak, Zinnur.
İsimlerden biri kesinlikle ana karakterde geçsin. Hikaye kısa, sade ve çocukların ilgisini çekecek şekilde olsun. 50 kelimeyi geçmeyecek yarım bırakılmış sonunda merak uyandıran hikaye metnini üret."`;

    const openaiRes = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Sen yaratıcı bir hikaye yazarı ve öğretmensin.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const story = openaiRes.data.choices[0]?.message?.content?.trim();
    if (!story) {
      return res.status(500).json({ message: 'Hikaye üretilemedi.' });
    }
    res.json({ story });
  } catch (error) {
    console.error('Eksik hikaye üretiminde hata:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Hikaye alınamadı.' });
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
// Eksik Hikaye Çizimi için Yapay Zeka Örnek Görsel Üretimi
app.post('/api/generate/story-drawing', async (req, res) => {
  const { story } = req.body;
  if (!story) {
    return res.status(400).json({ message: 'Hikaye veya kelime dizisi zorunludur.' });
  }
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API Anahtarı bulunamadı.");
    }
    // Gelen kelimeleri logla
    console.log('AI Prompt - Gelen kelimeler:', story);
    // 1. Önce kelimeleri İngilizceye çevir
    let englishWords = story;
    try {
      const translationRes = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'Sen bir çeviri asistanısın. Sana verilen Türkçe kelimeleri İngilizceye çevir ve sadece çevirileri virgülle ayırarak döndür. Örnek: Elma, Balık, Ev → Apple, Fish, House' },
            { role: 'user', content: `Şu kelimeleri İngilizceye çevir: ${story}` }
          ],
          max_tokens: 30,
          temperature: 0
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      englishWords = translationRes.data.choices[0]?.message?.content?.trim();
      englishWords = englishWords.replace(/^```[a-z]*\n?|\n?```$/g, '').replace(/^"|"$/g, '').trim();
      // Yanıt anlamsızsa fallback
      if (!englishWords || /object|undefined|null|\[|\{|\}/i.test(englishWords)) {
        console.warn('AI Prompt - İngilizce çeviri başarısız, Türkçe kelimeler kullanılacak:', englishWords);
        englishWords = story;
      }
      console.log('AI Prompt - İngilizce kelimeler:', englishWords);
    } catch (translationErr) {
      console.error('AI Prompt - İngilizceye çevirme hatası:', translationErr.response ? translationErr.response.data : translationErr.message);
      englishWords = story; // Çeviri başarısızsa Türkçe gönder
    }
    // 2. GPT-4o ile yaratıcı prompt oluştur
    const creativePromptGen = `crayon style, children's book illustration, drawn by a second-grade child. Simple shapes, bold outlines, bright primary colors.. Using ALL of the following three words, write a single imaginative English prompt for DALL-E 3. Each word MUST appear explicitly in the scene description. Do not just list the words, but weave them into a single, creative and coherent scene. Style: crayon style, children's book illustration, drawn by a second-grade child. Simple shapes, bold outlines, bright primary colors. Only return the prompt. Words: ${englishWords}`;
    console.log('AI Prompt - GPT-4o prompt şablonu:', creativePromptGen);
    let dallePrompt = '';
    try {
      const promptRes = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a creative children\'s crayon, children\'s drawing.' },
            { role: 'user', content: creativePromptGen }
          ],
          max_tokens: 100,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      // DALL·E promptunu temizle: kod bloğu, tırnak, açıklama vs. kaldır
      dallePrompt = promptRes.data.choices[0]?.message?.content?.trim();
      // Kod bloğu veya tırnak varsa temizle
      dallePrompt = dallePrompt.replace(/^```[a-z]*\n?|\n?```$/g, '').replace(/^"|"$/g, '').trim();
      // GPT-4o'dan dönen promptu logla
      console.log('AI Prompt - GPT-4o ürettiği:', dallePrompt);
      // DALL·E'ye giden son promptu logla
      console.log('AI Prompt - DALL·E ye giden:', dallePrompt);
      // Sadece tek satırlık kısa prompt gönder
      if (!dallePrompt || dallePrompt.length < 10) throw new Error('GPT-4o prompt üretemedi.');
    } catch (promptErr) {
      console.error('GPT-4o prompt üretim hatası:', promptErr.response ? promptErr.response.data : promptErr.message);
      // Hata olursa doğrudan hikayeyi kullanarak basit prompt oluştur
      dallePrompt = `Children's book illustration, crayon style, creative and balanced composition, combining these concepts: ${story}. Draw an inspiring and imaginative scene suitable for children, not just literal objects. No text.`;
    }
    // 2. DALL·E ile görsel üret
    // DALL·E promptunu 400 karakterle sınırla, mümkünse son tam cümlede bitir
    let dallePromptShort = dallePrompt.slice(0, 400);
    const lastDot = dallePromptShort.lastIndexOf('.');
    if (lastDot > 50) {
      dallePromptShort = dallePromptShort.slice(0, lastDot + 1);
    }
    // DALL·E'ye giden promptu logla
    console.log('AI Prompt - DALL·E ye giden:', dallePromptShort);
    const response = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: 'dall-e-3',
        prompt: dallePromptShort,
        size: '1024x1024'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const imageUrl = response.data.data[0]?.url;
    if (!imageUrl) {
      return res.status(500).json({ message: 'Görsel üretilemedi.' });
    }
    res.json({ imageUrl });
  } catch (error) {
    const openaiError = error?.response?.data || error.message;
    console.error('Yapay zeka örnek çizim üretim hatası:', openaiError);
    res.status(500).json({
      message: 'Yapay zeka örnek çizimi üretilemedi.',
      openaiError
    });
  }
});

// Eksik Hikaye Çizimi Değerlendirme API'sı
app.post('/api/evaluate/story-drawing', async (req, res) => {
  const { image, story } = req.body;
  if (!image || !story) {
    return res.status(400).json({ message: 'Resim ve hikaye zorunludur.' });
  }
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
              { type: 'text', text: `Bir ilkokul öğrencisinin, aşağıdaki eksik hikayenin devamını hayal ederek yaptığı çizimi, üstün bir resim öğretmeni gibi detaylı ve yapıcı şekilde değerlendir. Kriterler: Hikayeyle uyum, kompozisyon, çizgi kullanımı, yaratıcılık. Her kriter için kısa ve yapıcı bir yorum yaz. Sonucu sadece JSON formatında, şu anahtarlarla dön: hikayeyleUyum, kompozisyon, cizgi, yaraticilik. Hikaye: ${story}` },
              { type: 'image_url', image_url: { url: image, detail: "low" } },
            ]
          }
        ],
        max_tokens: 300,
        temperature: 0.8
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let evaluationResult;
    try {
      const rawContent = response.data.choices[0].message.content;
      const jsonString = rawContent.replace(/```json\n?|\n?```/g, '').trim();
      evaluationResult = JSON.parse(jsonString);
    } catch (parseError) {
      evaluationResult = { genelYorum: response.data.choices[0].message.content || "AI'dan geçerli bir değerlendirme alınamadı." };
    }
    res.json(evaluationResult);
  } catch (error) {
    console.error('Eksik hikaye çizimi değerlendirme hatası:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Yapay zeka değerlendirmesi sırasında bir hata oluştu.' });
  }
});

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
// server.js (Yeni rota eklendi)

// --- YENİ ROTA: Kelime Bazlı Örnek Çizim Üretimi ---
app.post('/api/generate/word-drawing', async (req, res) => {
  const { promptWords } = req.body; // Frontend'den 3 kelimelik dizi bekleniyor

  if (!promptWords || !Array.isArray(promptWords) || promptWords.length !== 3) {
    return res.status(400).json({ message: 'Geçerli 3 kelimelik bir dizi gönderilmelidir.' });
  }

  console.log('Örnek çizim isteği alındı, kelimeler:', promptWords);

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API Anahtarı bulunamadı.");
    }

    // --- Adım 1: Kelimeleri İngilizceye Çevirme (DALL-E için önerilir) ---
    let englishWords = promptWords.join(', '); // Başlangıçta Türkçe hali
    try {
      console.log("Kelimeler İngilizceye çevriliyor...");
      const translationRes = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini', // Çeviri için hızlı model
          messages: [
            { role: 'system', content: 'Sen bir çeviri asistanısın. Sana verilen Türkçe kelimeleri İngilizceye çevir ve sadece çevirileri virgülle ayırarak döndür.' },
            { role: 'user', content: `Şu kelimeleri İngilizceye çevir: ${promptWords.join(', ')}` }
          ],
          max_tokens: 40,
          temperature: 1.1 // Doğru çeviri için düşük temperature
        },
        { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
      );
      let translated = translationRes.data.choices[0]?.message?.content?.trim();
      if (translated && !/object|undefined|null|\[|\{|\}/i.test(translated)) {
         englishWords = translated.replace(/^```[a-z]*\n?|\n?```$/g, '').replace(/^"|"$/g, '').trim();
         console.log('Çevrilen İngilizce Kelimeler:', englishWords);
      } else {
          console.warn('İngilizce çeviri başarısız veya geçersiz, Türkçe kelimeler kullanılacak:', translated);
          englishWords = promptWords.join(', '); // Fallback to Turkish
      }
    } catch (translationErr) {
      console.error('İngilizceye çevirme API hatası, Türkçe kelimeler kullanılacak:', translationErr.response ? translationErr.response.data : translationErr.message);
      englishWords = promptWords.join(', '); // Hata durumunda Türkçe kullan
    }

    // --- Adım 2: Yaratıcı DALL-E Prompt'u Oluşturma (GPT-4o ile) ---
    console.log("Yaratıcı DALL-E prompt'u oluşturuluyor...");
    // Prompt'u daha spesifik hale getirelim: Stil: crayon, ilkokul 3. sınıf çizimi gibi
    const creativePromptGen = `crayon style, children's book illustration, drawn by a second-grade child. Simple shapes, bold outlines, bright primary colors.. Using ALL of the following three keywords: ${englishWords}, write a single, creative and coherent English scene description for DALL-E 3. The scene must be in crayon style, drawn as if by a primary school 3rd grade student, colorful, simple, and childlike. Each keyword MUST be woven into the scene. Style: crayon style, children's book illustration, drawn by a second-grade child. Simple shapes, bold outlines, bright primary colors.`;

    let dallePrompt = '';
    try {
      const promptRes = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o', // Yaratıcı prompt için güçlü model
          messages: [ { role: 'user', content: creativePromptGen } ],
          max_tokens: 150, // Prompt için yeterli alan
          temperature: 0.8 // Yaratıcılık için biraz daha yüksek temperature
        },
        { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
      );
      dallePrompt = promptRes.data.choices[0]?.message?.content?.trim();
      dallePrompt = dallePrompt.replace(/^```[a-z]*\n?|\n?```$/g, '').replace(/^"|"$/g, '').trim();
      if (!dallePrompt || dallePrompt.length < 15) throw new Error('GPT-4o yaratıcı prompt üretemedi.');
      console.log('GPT-4o Tarafından Üretilen Yaratıcı Prompt:', dallePrompt);
    } catch (promptErr) {
      console.error('GPT-4o yaratıcı prompt üretim hatası:', promptErr.response ? promptErr.response.data : promptErr.message);
      // Fallback: Kelimeleri doğrudan kullanan basit bir prompt
      dallePrompt = `Digital art illustration, highly creative composition combining the concepts: ${englishWords}. Imaginative scene.`;
      console.log('Fallback DALL-E Prompt\'u kullanılıyor:', dallePrompt);
    }

    // --- Adım 3: DALL-E ile Resim Üretme ---
    console.log("DALL-E ile örnek resim üretiliyor...");
    const imageResponse = await axios.post(
      'https://api.openai.com/v1/images/generations',
      {
        model: 'dall-e-3',
        prompt: `${dallePrompt} Style: crayon style, children's book illustration, drawn by a second-grade child. Simple shapes, bold outlines, bright primary colors.`, // Stil vurgusu ekle
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid'
      },
      { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } }
    );

    const imageUrl = imageResponse.data.data[0]?.url;
    if (!imageUrl) {
      throw new Error('OpenAI API\'sinden örnek görsel URL\'si alınamadı.');
    }

    res.json({ imageUrl }); // Başarılı olursa resim URL'sini dön

  } catch (error) {
    const errorSource = error.config?.url?.includes('chat/completions') ? (error.config?.data?.includes('Translate') ? 'Translation' : 'Prompt Generation') : 'DALL-E Generation';
    const openaiError = error?.response?.data;
    console.error(`Yapay zeka kelime çizimi üretim hatası (${errorSource}):`, openaiError || error.message);
    if (error.config?.data) console.error('İstek Detayları:', error.config.data);

    res.status(500).json({
      message: `Yapay zeka örnek çizimi üretilemedi (${errorSource} aşamasında hata).`,
      openaiError: openaiError || { error: { message: error.message, code: error.code } }
    });
  }
});
// --- YENİ ROTA SONU ---
// --- Sunucuyu Başlatma ---
app.listen(PORT, () => {
  console.log(`Backend sunucusu http://localhost:${PORT} adresinde çalışıyor.`);
});