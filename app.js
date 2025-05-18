const express = require("express");
const neo4j = require("neo4j-driver");
var bcrypt = require("bcryptjs");
const app = express();
const driver = neo4j.driver(
  "bolt://localhost:7687",
  neo4j.auth.basic("blank", "blank")
);
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
app.use(express.json({ limit: "50mb", extended: true, parameterLimit: 50000 }));
const cors = require("cors");
app.use(cors());
const { v4: uuidv4 } = require("uuid");

//postları getir
app.get("/posts", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(`MATCH (n:posts) RETURN n `);
    const records = result.records.map((record) => record.get("n").properties);

    res.json(records);
  } catch (error) {
    res.status(500).send("Error fetching data");
  } finally {
    await session.close();
  }
});
//herşeyi getir
app.get("/", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(`MATCH (n) RETURN n `); // Örnek sorgu, veriyi nasıl almak istediğinize göre değiştirin
    const records = result.records.map((record) => record.get("n").properties);

    res.json(records); // API'ye veriyi JSON formatında gönderme
  } catch (error) {
    res.status(500).send("Error fetching data");
  } finally {
    await session.close();
  }
});
///kullanıcıları gösterme
app.get("/register/:kullaniciadi", async (req, res) => {
  const { kullaniciadi } = req.params;
  const session = driver.session();

  try {
    const result = await session.run(
      `match(p:person{kullaniciadi:$kullaniciadi})-[r:follows]->(a:person) return a `,
      { kullaniciadi }
    ); // Örnek sorgu, veriyi nasıl almak istediğinize göre değiştirin
    const records = result.records.map((record) => record.get("a").properties);

    res.json(records); // API'ye veriyi JSON formatında gönderme
  } catch (error) {
    res.status(500).send("Error fetching data");
  } finally {
    await session.close();
  }
});

app.get("/register", async (req, res) => {
  const session = driver.session();
  try {
    const result = await session.run("match(p:person) return p ");
    const records = result.records.map((record) => record.get("p").properties);
    res.json(records);
  } catch (error) {
    console.log(error);
  }
});

//kendi postlarını getir
app.get("/myposts", async (req, res) => {
  const { kullaniciadi } = req.body;
  const session = driver.session();

  try {
    const result = await session.run(
      `
    MATCH (n:person{kullaniciadi:$kullaniciadi})
    MATCH (p:posts)-[:posted]->(n)
    RETURN p `,
      { kullaniciadi }
    ); // Örnek sorgu, veriyi nasıl almak istediğinize göre değiştirin
    const records = result.records.map((record) => record.get("p").properties);

    res.json(records); // API'ye veriyi JSON formatında gönderme
  } catch (error) {
    res.status(500).send("Error fetching data");
  } finally {
    await session.close();
  }
});

//kaydol
app.post("/register", async (req, res) => {
  const { adi, soyadi, email, telefon, kullaniciadi, dogumgunu, sifre, resim } =
    req.body;

  const session = driver.session();
  const uniqueId = uuidv4();
  let followernumber = 0;
  let realfollow = 0;
  let bio = "";
  try {
    const hashedPassword = await bcrypt.hash(sifre, 10);

    const unique = uniqueId;
    const result = await session.run(
      "CREATE (user:person { adi: $adi,soyadi:$soyadi,email:$email,telefon:$telefon,kullaniciadi:$kullaniciadi,dogumgunu:$dogumgunu,sifre:$sifre,resim:$resim ,unique:$unique,followernumber:$followernumber,realfollow:$realfollow,bio:$bio}) RETURN user",
      {
        adi,
        soyadi,
        email,
        telefon,
        kullaniciadi,
        dogumgunu,
        sifre,
        resim,
        unique,
        followernumber,
        realfollow,
        bio,
      }
    );

    const createdUser = result.records[0].get("user").properties;
    res.json(createdUser);
  } catch (error) {
    console.error("Hata:", error);
    res.status(500).send("Kullanıcı oluşturulamadı");
  } finally {
    await session.close();
  }
});

//giriş yap
app.post("/", async (req, res) => {
  const { username, password } = req.body;
  const session = driver.session();

  try {
    const result = await session.run(
      "MATCH (user:person { kullaniciadi: $username,sifre:$password }) RETURN user",
      { username, password }
    );
    if (result.records.length === 0) {
      return res.status(401).send("Kullanıcı adı veya şifre yanlış");
    }
    console.log("noldu");
    const hashedPassword = result.records[0].get("user").properties.sifre;
    const token = await jwt.sign({ username }, "mySecretKey", {
      expiresIn: "1h",
    });
    console.log(token);
    res.json({ token: token });
  } catch (error) {
    console.error("Hata:", error);
    res.status(500).send("Giriş yapılamadı");
  } finally {
    await session.close();
  }
});
const secretKey = "your_secret_key";

// Refresh token ile yeni bir erişim tokenı alma endpoint'i
app.post("/refresh-token", (req, res) => {
  const { refreshToken } = req.body;

  jwt.verify(refreshToken, secretKey, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ error: "Geçersiz veya süresi dolmuş token" });
    }

    const userId = decoded.userId;

    // Kullanıcıyı veritabanında bulma
    const result = session.run(
      "MATCH (user:person { kullaniciadi: $username,sifre:$password }) RETURN user",
      { username, password }
    );
    if (result.records.length === 0) {
      return res.status(401).send("Kullanıcı adı veya şifre yanlış");
    }
    console.log("noldu");
    const hashedPassword = result.records[0].get("user").properties.sifre;
    console.log(password, hashedPassword);
    if (password === hashedPassword) {
      console.log("oldu");
    } else {
      console.log("olç");
    }

    // Yeni bir erişim tokenı oluşturma
    const accessToken = jwt.sign(
      { userId: result.records[0].get("user").properties.sifre },
      secretKey,
      { expiresIn: "15m" }
    ); // Örnek olarak 15 dakika süreyle geçerli token

    return res.json({ accessToken });
  });
});

//post oluştur
app.post("/posts", async (req, res) => {
  const { baslik, yazi, kullaniciadi } = req.body;
  console.log(JSON.stringify(req.body));
  const session = driver.session();
  const uniqueId = uuidv4();
  const likenumber = 0;
  const review = 0;

  try {
    const unique = uniqueId;
    const result = await session.run(
      `MATCH (u:person {kullaniciadi: $kullaniciadi})
      CREATE (p:posts {baslik:$baslik, yazi:$yazi,kullaniciadi: $kullaniciadi,unique:$unique,likes:$likenumber,review:$review} )-[:posted]->(u)
      RETURN p`,
      { baslik, yazi, kullaniciadi, unique, likenumber, review }
    );

    const createdPost = result.records[0].get("p").properties;
    res.json(createdPost);
  } catch (error) {
    console.error("Hatab:", error);
    res.status(500).send("Post oluşturulamadı");
  } finally {
    await session.close();
  }
});

//kullanıcı verisi değiştir
app.put("/register", async (req, res) => {
  const {
    adi,
    soyadi,
    email,
    telefon,
    kullaniciadi,
    dogumgunu,
    sifre,
    bio,
    resim,
  } = req.body;
  console.log(JSON.stringify(req.body));

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (p:person{kullaniciadi:$kullaniciadi})
       MATCH (p:person{unique:p.unique})
       SET p.adi =$adi,p.soyadi=$soyadi,p.email=$email,p.telefon=$telefon,p.kullaniciadi=$kullaniciadi,p.dogumgunu=$dogumgunu,p.sifre=$sifre,p.bio=$bio,p.resim=$resim
       RETURN p
       `,
      {
        adi,
        soyadi,
        email,
        telefon,
        kullaniciadi,
        dogumgunu,
        sifre,
        bio,
        resim,
      }
    );
    const updatedPost = result.records[0].get("p").properties;
    res.json(updatedPost);
    console.log(updatedPost);
  } catch (error) {
    console.error("Hatab:", error);
    res.status(500).send("Post oluşturulamadı");
  } finally {
    await session.close();
  }
});
//takipçi arttır
app.put("/register/:kullaniciadi", async (req, res) => {
  const { kullaniciadi } = req.params;
  const { followernumber, realfollow, kullaniciadi1 } = req.body;
  console.log("bu ne", JSON.stringify(req.body));
  console.log("bu ne2", JSON.stringify(req.params));

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (p:person{kullaniciadi:$kullaniciadi})
       MATCH (p:person{unique:p.unique})
       match(a:person{kullaniciadi:$kullaniciadi1})
       SET p.followernumber=$followernumber,a.realfollow=$realfollow
       RETURN p ,a as e
       `,
      { kullaniciadi, followernumber, kullaniciadi1, realfollow }
    );
    const updatedPost = result.records[0].get("e").properties;
    res.json(updatedPost);
    console.log(updatedPost);
  } catch (error) {
    console.error("Hatab:", error);
    res.status(500).send("Post oluşturulamadı");
  } finally {
    await session.close();
  }
});
//kullanıcı silme
app.delete("/register/:kullaniciadi", async (req, res) => {
  const { kullaniciadi } = req.params;
  console.log(JSON.stringify(req.body));
  console.log(req.params.kullaniciadi);
  console.log(req.params);
  console.log(kullaniciadi);

  const session = driver.session();
  try {
    const result = await session.run(
      `MATCH (p:person{kullaniciadi:$kullaniciadi})
      optional MATCH (r:posts)-[:posted]->(p) 
      optional MATCH (r)-[:commented]->(a:comments) 
      optional MATCH (a)-[:replied]->(b:replies) 
      optional MATCH (t:notifications)-[:notificate]->(p) 
      
      detach delete r,p,a,b,t
      `,
      { kullaniciadi }
    );
  } catch (error) {
    console.log("Kullanıcı silinemedi", error);
  } finally {
    await session.close();
  }
});
///takip etme
app.post("/followers", async (req, res) => {
  const { kullaniciadi1, kullaniciadi2 } = req.body;
  console.log(JSON.stringify(req.body));
  const session = driver.session();

  try {
    const result = await session.run(
      `match(p:person{kullaniciadi:$kullaniciadi1})
      match(a:person{kullaniciadi:$kullaniciadi2})
      create(p)-[:follows{id:1}]->(a)`,
      { kullaniciadi1, kullaniciadi2 }
    );
    console.log("Takip edildi");
  } catch (error) {
    console.error("Hatab:", error);
    res.status(500).send("Post oluşturulamadı");
  } finally {
    await session.close();
  }
});
//follow var mı yok mu diye döndürüyo
app.get("/followers/:kullaniciadi1/:kullaniciadi2", async (req, res) => {
  const { kullaniciadi1, kullaniciadi2 } = req.params;
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (p:person { kullaniciadi: $kullaniciadi1 })-[f:follows]->(a:person { kullaniciadi: $kullaniciadi2 })
      RETURN f`,
      { kullaniciadi1, kullaniciadi2 }
    );

    if (result.records.length > 0) {
      console.log(
        `${kullaniciadi1} ${kullaniciadi2} arasında follows ilişkisi var`
      );
      res.status(200).json({ follows: true });
    } else {
      console.log(
        `${kullaniciadi1} ${kullaniciadi2} arasında follows ilişkisi yok`
      );
      res.status(200).json({ follows: false });
    }
  } catch (error) {
    console.error("Hata:", error);
    res.status(500).send("İstek işlenemedi");
  } finally {
    await session.close();
  }
});
//takipten çıkma
app.delete("/followers/:kullaniciadi1/:kullaniciadi2", async (req, res) => {
  const { kullaniciadi1, kullaniciadi2 } = req.params;
  const session = driver.session();
  try {
    console.log("15");
    const result = await session.run(
      `match(:person{kullaniciadi:$kullaniciadi1})-[r:follows]-(:person{kullaniciadi:$kullaniciadi2}) detach delete r
      `,
      { kullaniciadi1, kullaniciadi2 }
    );
    console.log("1");
    console.log("silindi");
  } catch (error) {
    console.log("Kullanıcı silinemedi", error);
  } finally {
    await session.close();
  }
});
//takip edilenleri getiriyo heralde
app.get("/register/:kullaniciadi/:which", async (req, res) => {
  const { kullaniciadi, which } = req.params;
  const session = driver.session();
  console.log(req.params);
  try {
    if (which == "following") {
      const result = await session.run(
        `match(p:person{kullaniciadi:$kullaniciadi})-[r:follows]->(a:person) return a`,
        { kullaniciadi }
      );
      const records = result.records.map(
        (record) => record.get("a").properties
      );
      res.json(records); // API'ye veriyi JSON formatında gönderme
    } else {
      const result = await session.run(
        `MATCH (p:person)-[r:follows]->(a:person{kullaniciadi:$kullaniciadi}) return p`,
        { kullaniciadi }
      );
      const records = result.records.map(
        (record) => record.get("p").properties
      );
      res.json(records); // API'ye veriyi JSON formatında gönderme
    }
  } catch (error) {
    console.error("Hata:", error);
    res.status(500).send("İstek işlenemedi");
  } finally {
    await session.close();
  }
});
//post silme
app.delete("/posts/:unique", async (req, res) => {
  const { unique } = req.params;
  console.log(JSON.stringify(req.body));
  const session = driver.session();

  try {
    console.log("15");
    const result = await session.run(
      `match (p:posts{unique:$unique}) 
      optional match (p)-[:commented]->(r:comments)
      optional match (r)-[:replied]->(a:replies)
      detach delete p,a,r
      `,
      { unique }
    );
    console.log("silindi");
  } catch (error) {
    console.log("Kullanıcı silinemedi", error);
  } finally {
    await session.close();
  }
});
//comment silme
app.delete("/comments/:unique", async (req, res) => {
  const { unique } = req.params;
  console.log(JSON.stringify(req.body));
  const session = driver.session();

  try {
    console.log("15");
    const result = await session.run(
      `match (p:comments{uniquecomment:$unique}) 
      optional MATCH (p)-[:replied]->(b:replies) 
      detach delete p,b
      `,
      { unique }
    );
    console.log("silindi");
  } catch (error) {
    console.log("Kullanıcı silinemedi", error);
  } finally {
    await session.close();
  }
});
//reply silme
app.delete("/replies/:unique", async (req, res) => {
  const { unique } = req.params;
  console.log(JSON.stringify(req.body));
  const session = driver.session();

  try {
    console.log("15");
    const result = await session.run(
      `match (p:replies{uniqueresponse:$unique}) detach delete p
      `,
      { unique }
    );
    console.log("silindi");
  } catch (error) {
    console.log("Kullanıcı silinemedi", error);
  } finally {
    await session.close();
  }
});
//post güncelleme
app.put("/posts/:unique", async (req, res) => {
  const { yazi, which, likes, review } = req.body;
  const { unique } = req.params;
  const session = driver.session();
  try {
    if (which == "yaziupdate") {
      const result = await session.run(
        `match (p:posts{unique:$unique})
         SET p.yazi =$yazi
         RETURN p
         `,
        { unique, yazi }
      );
      const updatedPost = result.records[0].get("p").properties;
      res.json(updatedPost);
      console.log(updatedPost);
    } else if (which == "like") {
      const result = await session.run(
        `match (p:posts{unique:$unique})
         SET p.likes =$likes
         RETURN p
         `,
        { unique, likes }
      );
      const updatedPost = result.records[0].get("p").properties;
      res.json(updatedPost);
      console.log(updatedPost);
    } else if (which == "review") {
      const result = await session.run(
        `match (p:posts{unique:$unique})
         SET p.review =$review
         RETURN p
         `,
        { unique, review }
      );
      const updatedPost = result.records[0].get("p").properties;
      res.json(updatedPost);
      console.log(updatedPost);
    }
  } catch (error) {
    console.error("Hatab:", error);
    res.status(500).send("Post oluşturulamadı");
  } finally {
    await session.close();
  }
});
//comment güncelleme
app.put("/comments/:unique", async (req, res) => {
  const { yorum, which, review } = req.body;
  const { unique } = req.params;
  const session = driver.session();
  try {
    if (which == "yorumupdate") {
      const result = await session.run(
        `match (p:comments{uniquecomment:$unique})
         SET p.yorum =$yorum
         RETURN p
         `,
        { unique, yorum }
      );
      const updatedPost = result.records[0].get("p").properties;
      res.json(updatedPost);
      console.log(updatedPost);
    }
  } catch (error) {
    console.error("Hatab:", error);
    res.status(500).send("Post oluşturulamadı");
  } finally {
    await session.close();
  }
});
//
app.get("/posts/:unique", async (req, res) => {
  const { unique } = req.params;
  const session = driver.session();

  try {
    const result = await session.run(
      `MATCH (p:posts { unique: $unique})
      RETURN p.likes`,
      { kullaniciadi1, kullaniciadi2 }
    );

    if (result.records.length > 0) {
      console.log(`s`);
      res.status(200).json({ liked: true });
    } else {
      console.log(`s`);
      res.status(200).json({ liked: false });
    }
  } catch (error) {
    console.error("Hata:", error);
    res.status(500).send("İstek işlenemedi");
  } finally {
    await session.close();
  }
});

///beğen
app.post("/like", async (req, res) => {
  const { kullaniciadi, unique, which } = req.body;
  console.log(JSON.stringify(req.body));
  const session = driver.session();
  try {
    if (which == "post") {
      const result = await session.run(
        `match(p:person{kullaniciadi:$kullaniciadi})
        match(a:posts{unique:$unique})
        create(p)-[:like]->(a)
        set a.likes=a.likes+1
        `,
        { kullaniciadi, unique }
      );
      console.log("Tbeğeni");
    } else if (which == "comment") {
      const result = await session.run(
        `match(p:person{kullaniciadi:$kullaniciadi})
        match(a:comments{uniquecomment:$unique})
        create(p)-[:like]->(a)
        set a.likes=a.likes+1
        `,
        { kullaniciadi, unique }
      );
      console.log("Tbeğeni");
    } else if (which == "reply") {
      const result = await session.run(
        `match(p:person{kullaniciadi:$kullaniciadi})
        match(a:replies{uniqueresponse:$unique})
        create(p)-[:like]->(a)
        set a.likes=a.likes+1
        `,
        { kullaniciadi, unique }
      );
      console.log("Tbeğeni");
    }
  } catch (error) {
    console.error("Hatab:", error);
    res.status(500).send("Post oluşturulamadı");
  } finally {
    await session.close();
  }
});
//dontlike
app.delete("/like/:kullaniciadi/:unique/:which", async (req, res) => {
  const { kullaniciadi, unique, which } = req.params;
  console.log(JSON.stringify(req.body));
  const session = driver.session();

  try {
    console.log("15");

    if (which == "post") {
      const result = await session.run(
        `match(:person{kullaniciadi:$kullaniciadi})-[r:like]-(p:posts{unique:$unique}) detach delete r
        set p.likes=p.likes-1
        `,
        { unique, kullaniciadi }
      );
      console.log("silindi");
    } else if (which == "comment") {
      const result = await session.run(
        `match(:person{kullaniciadi:$kullaniciadi})-[r:like]-(p:comments{uniquecomment:$unique}) detach delete r
        set p.likes=p.likes-1
        `,
        { unique, kullaniciadi }
      );
      console.log("silindi");
    } else if (which == "reply") {
      const result = await session.run(
        `match(:person{kullaniciadi:$kullaniciadi})-[r:like]-(p:replies{uniqueresponse:$unique}) detach delete r
        set p.likes=p.likes-1
        `,
        { unique, kullaniciadi }
      );
      console.log("silindi");
    }
  } catch (error) {
    console.log("Kullanıcı silinemedi", error);
  } finally {
    await session.close();
  }
});

//like var mı yok mu diye döndürüyo
app.get("/like/:kullaniciadi/:unique/:which", async (req, res) => {
  const { kullaniciadi, unique, which } = req.params;
  const session = driver.session();

  try {
    if (which == "post") {
      const result = await session.run(
        `MATCH (p:person { kullaniciadi: $kullaniciadi })-[f:like]->(a:posts { unique: $unique })
        RETURN f`,
        { kullaniciadi, unique }
      );

      if (result.records.length > 0) {
        res.status(200).json({ like: true });
      } else {
        res.status(200).json({ like: false });
      }
    } else if (which == "comment") {
      const result = await session.run(
        `MATCH (p:person { kullaniciadi: $kullaniciadi })-[f:like]->(a:comments { uniquecomment: $unique })
        RETURN f`,
        { kullaniciadi, unique }
      );

      if (result.records.length > 0) {
        res.status(200).json({ like: true });
      } else {
        res.status(200).json({ like: false });
      }
    } else if (which == "reply") {
      const result = await session.run(
        `MATCH (p:person { kullaniciadi: $kullaniciadi })-[f:like]->(a:replies { uniqueresponse: $unique })
        RETURN f`,
        { kullaniciadi, unique }
      );

      if (result.records.length > 0) {
        res.status(200).json({ like: true });
      } else {
        res.status(200).json({ like: false });
      }
    }
  } catch (error) {
    console.error("Hata:", error);
    res.status(500).send("İstek işlenemedi");
  } finally {
    await session.close();
  }
});

//yorum oluştur
app.post("/comments", async (req, res) => {
  const { yorum, kullaniciadi, unique, commentperson } = req.body;
  const session = driver.session();
  const uniqueId = uuidv4();
  const likes = 0;
  try {
    const uniquecomment = uniqueId;
    console.log("4");
    const result = await session.run(
      `MATCH (u:posts {unique: $unique})
      CREATE (u)-[:commented]->(p:comments{yorum:$yorum,uniquecomment:$uniquecomment,kullaniciadi:$kullaniciadi,unique:$unique,commentperson:$commentperson,likes:$likes
      })
      RETURN p`,
      { uniquecomment, yorum, kullaniciadi, unique, commentperson, likes }
    );
    const createdPost = result.records[0].get("p").properties;
    res.json(createdPost);
  } catch (error) {
    console.error("Hatab:", error);
    res.status(500).send("Post oluşturulamadı");
    if (error.response) {
      console.error("Server responded with an error:", error.response.data);
    } else if (error.request) {
      console.error("No response received:", error.request);
    } else {
      console.error("Error setting up the request:", error.message);
    }
  } finally {
    await session.close();
  }
});

// yorumlarını  getir
app.get("/comments", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(`
    MATCH (p:comments)
    RETURN p
    
    `); // Örnek sorgu, veriyi nasıl almak istediğinize göre değiştirin
    const records = result.records.map((record) => record.get("p").properties);

    res.json(records); // API'ye veriyi JSON formatında gönderme
  } catch (error) {
    res.status(500).send("Error fetching data");
  } finally {
    await session.close();
  }
});

//yanıt oluştur
app.post("/replies", async (req, res) => {
  const { yanit, kullaniciadi, uniquecomment, responseperson } = req.body;
  console.log(JSON.stringify(req.body));
  const session = driver.session();
  const uniqueId = uuidv4();
  const likes = 0;
  try {
    const uniqueresponse = uniqueId;
    const result = await session.run(
      `MATCH (u:comments{uniquecomment: $uniquecomment})
      CREATE (u)-[:replied]->(p:replies{yanit:$yanit,uniqueresponse:$uniqueresponse,kullaniciadi:$kullaniciadi,responseperson:$responseperson,uniquecomment:$uniquecomment,likes:$likes
      })
      RETURN p`,
      {
        uniquecomment,
        yanit,
        kullaniciadi,
        uniqueresponse,
        responseperson,
        likes,
      }
    );

    const createdPost = result.records[0].get("p").properties;
    res.json(createdPost);
  } catch (error) {
    console.error("Hatab:", error);
    res.status(500).send("Post oluşturulamadı");
  } finally {
    await session.close();
  }
});
// yanitlari  getir
app.get("/replies", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(`
    MATCH (p:replies)
    RETURN p `); // Örnek sorgu, veriyi nasıl almak istediğinize göre değiştirin
    const records = result.records.map((record) => record.get("p").properties);

    res.json(records); // API'ye veriyi JSON formatında gönderme
  } catch (error) {
    res.status(500).send("Error fetching data");
  } finally {
    await session.close();
  }
});

app.post("/notifications", async (req, res) => {
  const {
    kullaniciadi1,
    getter,
    which,
    postunique,
    commentunique,
    replyunique,
  } = req.body;
  const session = driver.session();

  try {
    if (which == "follow") {
      const result = await session.run(
        `
      match(a:person{kullaniciadi:$getter})

        create(p:notifications{kullaniciadi1:$kullaniciadi1,getter:$getter,which:$which})-[:notificate]->(a) return p
      `,
        { kullaniciadi1, getter, which }
      );

      const createdPost = result.records[0].get("p").properties;
      res.json(createdPost);
    } else if (which == "postlike") {
      const result = await session.run(
        `
      match(a:person{kullaniciadi:$getter})

        create(p:notifications{kullaniciadi1:$kullaniciadi1,getter:$getter,postunique:$postunique,which:$which})-[:notificate]->(a) return p
      `,
        { kullaniciadi1, getter, postunique, which }
      );

      const createdPost = result.records[0].get("p").properties;
      res.json(createdPost);
    } else if (which == "commentlike") {
      const result = await session.run(
        `
      match(a:person{kullaniciadi:$getter})

        create(p:notifications{kullaniciadi1:$kullaniciadi1,getter:$getter,commentunique:$commentunique,which:$which})-[:notificate]->(a) return p
      `,
        { kullaniciadi1, getter, commentunique, which }
      );

      const createdPost = result.records[0].get("p").properties;
      res.json(createdPost);
    } else if (which == "replylike") {
      const result = await session.run(
        `
      match(a:person{kullaniciadi:$getter})
        create(p:notifications{kullaniciadi1:$kullaniciadi1,getter:$getter,replyunique:$replyunique,which:$which})-[:notificate]->(a) return p
      `,
        { kullaniciadi1, getter, replyunique, which }
      );

      const createdPost = result.records[0].get("p").properties;
      res.json(createdPost);
    } else if (which == "comment") {
      const result = await session.run(
        `
      match(a:person{kullaniciadi:$getter})

        create(p:notifications{kullaniciadi1:$kullaniciadi1,getter:$getter,postunique:$postunique,which:$which})-[:notificate]->(a) return p
      `,
        { kullaniciadi1, getter, postunique, which }
      );

      const createdPost = result.records[0].get("p").properties;
      res.json(createdPost);
    } else if (which == "reply") {
      const result = await session.run(
        `
      match(a:person{kullaniciadi:$getter})

        create(p:notifications{kullaniciadi1:$kullaniciadi1,getter:$getter,commentunique:$commentunique,which:$which})-[:notificate]->(a) return p
      `,
        { kullaniciadi1, getter, commentunique, which }
      );

      const createdPost = result.records[0].get("p").properties;
      res.json(createdPost);
    } else if (which == "postreply") {
      const result = await session.run(
        `
      match(a:person{kullaniciadi:$getter})

        create(p:notifications{kullaniciadi1:$kullaniciadi1,getter:$getter,which:$which,postunique:$postunique})-[:notificate]->(a) return p
      `,
        { kullaniciadi1, getter, which, postunique }
      );

      const createdPost = result.records[0].get("p").properties;
      res.json(createdPost);
    }
  } catch (error) {
    console.log(error);
  } finally {
    await session.close();
  }
});

app.get("/notifications", async (req, res) => {
  const session = driver.session();

  try {
    const result = await session.run(`
    MATCH (p:notifications)
    RETURN p `); // Örnek sorgu, veriyi nasıl almak istediğinize göre değiştirin
    const records = result.records.map((record) => record.get("p").properties);

    res.json(records); // API'ye veriyi JSON formatında gönderme
  } catch (error) {
    res.status(500).send("Error fetching data");
  } finally {
    await session.close();
  }
});

app.post("/message", async (req, res) => {
  const session = driver.session();
  const { which, sender, getter, message, date } = req.body;
  try {
    if (which == "messaged") {
      const result = await session.run(
        `
    match(a:person{kullaniciadi:$sender})
    match(b:person{kullaniciadi:$getter})
    MERGE (a)-[:messaged]->(c:message{user1:$sender,user2:$getter})
    MERGE (b)-[:messaged]->(c)
    return c
    `,
        { sender, getter }
      );
      const createdPost = result.records[0].get("c").properties;
      res.json(createdPost);
    } else if (which == "texted") {
      const result = await session.run(
        `
      match(c:message{user1:$sender,user2:$getter})
      create (c)-[:texted]->(d:texts{sender:$sender,message:$message,date:$date,getter:$getter})
      return d
      `,
        { sender, getter, message, date }
      );
      const createdPost = result.records[0].get("d").properties;
      res.json(createdPost);
    }
  } catch (error) {
    console.log(error);
  }
});

app.get("/message/:sender/:getter", async (req, res) => {
  const session = driver.session();
  const { sender, getter } = req.params;

  try {
    const result = await session.run(
      `
      match(d:texts{sender:$sender,getter:$getter}) return d
    `,
      { sender, getter }
    );

    const records = result.records.map((record) => record.get("d").properties);
    res.json(records); // API'ye veriyi JSON formatında gönderme
  } catch (error) {
    console.log(error);
  }
});
app.get("/message", async (req, res) => {
  const session = driver.session();
  const { sender, getter } = req.params;

  try {
    const result = await session.run(`
      match(d:message) return d
    `);

    const records = result.records.map((record) => record.get("d").properties);
    res.json(records); // API'ye veriyi JSON formatında gönderme
  } catch (error) {
    console.log(error);
  }
});
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
