const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 4002;
const mongoose = require("mongoose");
const Utilisateur = require("./utilisateur");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

mongoose.set("strictQuery", true);
mongoose
  .connect("mongodb://localhost/auth-service")
  .then(() => console.log(`Auth-Service DB Connected`))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

app.use(express.json());

// Middleware d'authentification
const isAuthenticated = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Token d'authentification manquant" });
  }

  jwt.verify(token, "secret", (err, user) => {
    if (err) {
      return res.status(401).json({ message: err });
    } else {
      req.user = user;
      next();
    }
  });
};

// POST /auth/register : Inscription d'un nouvel utilisateur
app.post("/auth/register", async (req, res) => {
  let { nom, email, mot_de_passe } = req.body;
  //On vérifie si le nouvel utilisateur est déjà inscrit avec la même adresse email ou pas
  const userExists = await Utilisateur.findOne({ email });
  if (userExists) {
    return res.json({ message: "Cet utilisateur existe déjà" });
  } else {
    bcrypt.hash(mot_de_passe, 10, (err, hash) => {
      if (err) {
        return res.status(500).json({
          error: err,
        });
      } else {
        mot_de_passe = hash;
        const newUtilisateur = new Utilisateur({
          nom,
          email,
          mot_de_passe,
        });

        newUtilisateur
          .save()
          .then((user) => res.status(201).json(user))
          .catch((error) => res.status(400).json({ error }));
      }
    });
  }
});

// POST /auth/login : Connexion d'un utilisateur
app.post("/auth/login", async (req, res) => {
  const { email, mot_de_passe } = req.body;
  const utilisateur = await Utilisateur.findOne({ email });
  if (!utilisateur) {
    return res.json({ message: "Utilisateur introuvable" });
  } else {
    bcrypt.compare(mot_de_passe, utilisateur.mot_de_passe).then((resultat) => {
      if (!resultat) {
        return res.json({ message: "Mot de passe incorrect" });
      } else {
        const payload = {
          email,
          nom: utilisateur.nom,
        };
        jwt.sign(payload, "secret", (err, token) => {
          if (err) console.log(err);
          else return res.json({ token: token });
        });
      }
    });
  }
});

// GET /auth/profil : Retourne les informations de l'utilisateur connecté
app.get("/auth/profil", isAuthenticated, async (req, res) => {
  try {
    const utilisateur = await Utilisateur.findOne({ email: req.user.email });

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Ne pas envoyer le mot de passe
    const { mot_de_passe, ...userInfo } = utilisateur.toObject();

    return res.status(200).json(userInfo);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur serveur", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Auth-Service at ${PORT}`);
});
