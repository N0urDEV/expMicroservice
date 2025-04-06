const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 4001;
const mongoose = require("mongoose");
const Commande = require("./Commande");
const axios = require("axios");
const isAuthenticated = require("./isAuthenticated");

//Connexion à la base de données
mongoose.set("strictQuery", true);
mongoose
  .connect("mongodb://localhost/commande-service")
  .then(() => console.log(`commande-Service DB Connected`))
  .catch((err) => console.error("Could not connect to MongoDB:", err));
app.use(express.json());

// POST /commande/ajouter : Ajouter une nouvelle commande
app.post("/commande/ajouter", isAuthenticated, async (req, res) => {
  try {
    const { produits } = req.body;

    if (!produits || !Array.isArray(produits) || produits.length === 0) {
      return res.status(400).json({ message: "Liste de produits invalide" });
    }

    // Récupérer les IDs des produits
    const productIds = produits.map((p) => p.produit_id);

    // Vérifier que les produits existent et ont assez de stock
    const productsResponse = await axios.post(
      "http://localhost:4000/produit/acheter",
      { ids: productIds },
      {
        headers: {
          Authorization: req.headers.authorization,
        },
      }
    );

    const productsData = productsResponse.data;

    // Vérifier le stock pour chaque produit
    for (const product of productsData) {
      const orderedProduct = produits.find((p) => p.produit_id === product._id);
      if (!orderedProduct) continue;

      if (product.stock < orderedProduct.quantite) {
        return res.status(400).json({
          message: `Stock insuffisant pour le produit ${product.nom}`,
        });
      }
    }

    // Calculer le prix total
    let prix_total = 0;
    for (const product of productsData) {
      const orderedProduct = produits.find((p) => p.produit_id === product._id);
      if (orderedProduct) {
        prix_total += product.prix * orderedProduct.quantite;
      }
    }

    // Créer la commande
    const newCommande = new Commande({
      produits,
      client_id: req.user.email,
      prix_total,
      statut: "En attente",
    });

    await newCommande.save();

    // Mettre à jour le stock pour chaque produit
    for (const product of productsData) {
      const orderedProduct = produits.find((p) => p.produit_id === product._id);
      if (orderedProduct) {
        await axios.patch(
          `http://localhost:4000/produit/${product._id}/stock`,
          { stock: product.stock - orderedProduct.quantite },
          {
            headers: {
              Authorization: req.headers.authorization,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    return res.status(201).json(newCommande);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erreur serveur", error: error.message });
  }
});

// GET /commande/:id : Récupérer une commande spécifique
app.get("/commande/:id", isAuthenticated, async (req, res) => {
  try {
    const commande = await Commande.findById(req.params.id);

    if (!commande) {
      return res.status(404).json({ message: "Commande introuvable" });
    }

    return res.status(200).json(commande);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error });
  }
});

// PATCH /commande/:id/statut : Mettre à jour le statut d'une commande
app.patch("/commande/:id/statut", isAuthenticated, async (req, res) => {
  try {
    const { statut } = req.body;

    if (!statut || !["En attente", "Confirmée", "Expédiée"].includes(statut)) {
      return res.status(400).json({ message: "Statut invalide" });
    }

    const commande = await Commande.findByIdAndUpdate(
      req.params.id,
      { statut },
      { new: true }
    );

    if (!commande) {
      return res.status(404).json({ message: "Commande introuvable" });
    }

    return res.status(200).json(commande);
  } catch (error) {
    console.error(error);
    return res.status(400).json({ error });
  }
});

app.listen(PORT, () => {
  console.log(`Commande-Service at ${PORT}`);
});
