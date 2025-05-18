# Sosyal Medya Uygulaması Backend

Bu proje, Neo4j veritabanı kullanan bir sosyal medya uygulamasının Node.js (Express) tabanlı backend API'sidir. Kullanıcı yönetimi, gönderi paylaşımı, takip etme, beğeni, yorum, yanıt, bildirim ve mesajlaşma gibi temel sosyal medya işlevlerini içerir.

## Özellikler

- **Kullanıcı Kayıt ve Giriş:** JWT ile kimlik doğrulama, şifreleme (bcryptjs).
- **Gönderi Yönetimi:** Gönderi oluşturma, silme, güncelleme, beğenme.
- **Yorum ve Yanıtlar:** Gönderilere yorum ve yanıtlama, silme ve güncelleme.
- **Takip Sistemi:** Kullanıcılar arasında takip etme ve takipten çıkma.
- **Beğeni Sistemi:** Gönderi, yorum ve yanıtlara beğeni ekleme/çıkarma.
- **Bildirimler:** Takip, beğeni, yorum ve yanıt aktiviteleri için bildirimler.
- **Mesajlaşma:** Kullanıcılar arası özel mesajlaşma.
- **Neo4j Entegrasyonu:** Tüm ilişkiler ve veriler Neo4j graph veritabanında tutulur.

## Kurulum

1. **Depoyu klonlayın:**

   ```bash
   git clone <repo-link>
   cd SocialMediaAppBackend
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   npm install
   ```
3. **Sunucuyu başlatın:**
   ```bash
   npm start
   ```
   veya geliştirme için:
   ```bash
   npx nodemon app.js
   ```

## Kullanılan Teknolojiler

- Node.js & Express.js
- Neo4j (neo4j-driver)
- JWT (jsonwebtoken)
- Bcrypt (bcryptjs)
- UUID
- CORS, Body-Parser

## API Endpointleri

Başlıca endpointler:

- `POST /register` - Kullanıcı kaydı
- `POST /` - Giriş (login)
- `GET /posts` - Tüm gönderileri getir
- `POST /posts` - Gönderi oluştur
- `PUT /posts/:unique` - Gönderi güncelle
- `DELETE /posts/:unique` - Gönderi sil
- `POST /comments` - Yorum ekle
- `POST /replies` - Yanıt ekle
- `POST /followers` - Takip et
- `DELETE /followers/:kullaniciadi1/:kullaniciadi2` - Takipten çık
- `POST /like` - Beğeni ekle
- `DELETE /like/:kullaniciadi/:unique/:which` - Beğeni kaldır
- `POST /notifications` - Bildirim oluştur
- `POST /message` - Mesaj gönder
- ...ve daha fazlası

Tüm endpointler ve detayları için `app.js` dosyasını inceleyebilirsiniz.

## Notlar

- Bu backend projesi, temel işlevselliği sağlamak amacıyla hızlıca geliştirilmiştir. Kodun tamamı temiz kod (clean code) standartlarına ve en iyi yazılım geliştirme pratiklerine tam olarak uygun değildir.
- Kodun okunabilirliği, modülerliği ve sürdürülebilirliği açısından iyileştirmeler yapılması gerekmektedir.
- Özellikle hata yönetimi, kod tekrarlarının azaltılması, fonksiyonların ayrıştırılması ve güvenlik konularında geliştirmeye açıktır.
- Bu backend API'siyle entegre çalışan mobil uygulama, farklı bir GitHub reposunda bulunmaktadır. Uygulamanın arayüzü ve istemci tarafı kodlarına erişmek için [Social-Media-App-with-NoSQL](https://github.com/edacolakx/Social-Media-App-with-NoSQL) reposunu ziyaret edebilirsiniz.

> **Not:** Uygulamanın Neo4j veritabanına bağlanabilmesi için, `app.js` dosyasında yer alan Neo4j kullanıcı adı ve şifre bilgilerini kendi Neo4j kurulumunuza göre güncellemeniz gerekmektedir. Her kullanıcı, kendi Neo4j kullanıcı adı ve şifresini kullanmalıdır. Aksi halde bağlantı sağlanamaz.
