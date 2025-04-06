const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 4003;
const mongoose = require("mongoose");
const Livraison = require("./livraison");
const axios = require("axios");
const isAuthenticated = require("./isAuthenticated");

// Connexion à la base de données
mongoose.set("strictQuery", true);
mongoose
  .connect("mongodb://localhost/livraison-service")
  .then(() => console.log(`Livraison-Service DB Connected`))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

app.use(express.json());

// POST /livraison/ajouter : Ajouter une nouvelle livraison
app.post("/livraison/ajouter", isAuthenticated, async (req, res) => {
  try {
    const { commande_id, transporteur_id, adresse_livraison } = req.body;

    // Vérifier si la commande existe
    const commandeResponse = await axios.get(
      `http://localhost:4001/commande/${commande_id}`,
      {
        headers: {
          Authorization: req.headers.authorization,
        },
      }
    );

    if (!commandeResponse.data) {
      return res.status(404).json({ message: "Commande introuvable" });
    }

    // Créer une nouvelle livraison
    const newLivraison = new Livraison({
      commande_id,
      transporteur_id,
      adresse_livraison,
    });

    await newLivraison.save();

    // Mettre à jour le statut de la commande à "Expédiée"
    await axios.patch(
      `http://localhost:4001/commande/${commande_id}/statut`,
      { statut: "Expédiée" },
      {
        headers: {
          Authorization: req.headers.authorization,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(201).json(newLivraison);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur serveur", error: error.message });
  }
});

// PUT /livraison/:id : Mettre à jour le statut de la livraison
app.put("/livraison/:id", isAuthenticated, async (req, res) => {
  try {
    const { statut } = req.body;
    const { id } = req.params;

    if (!["En attente", "En cours", "Livrée"].includes(statut)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const livraison = await Livraison.findByIdAndUpdate(
      id,
      { statut },
      { new: true }
    );

    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }

    return res.status(200).json(livraison);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur serveur", error: error.message });
  }
});

// GET /livraison/:id : Récupérer une livraison spécifique
app.get("/livraison/:id", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const livraison = await Livraison.findById(id);

    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }

    return res.status(200).json(livraison);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur serveur", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Livraison-Service at ${PORT}`);
});
