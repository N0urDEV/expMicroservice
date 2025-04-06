const express = require("express");
const app = express();
const PORT = process.env.PORT_ONE || 4000;
const mongoose = require("mongoose");
const Produit = require("./produit");
const isAuthenticated = require("./isAuthenticated");

app.use(express.json());
mongoose.set("strictQuery", true);
//Connection à la base de données MongoDB publication-service-db
//(Mongoose créera la base de données s'il ne le trouve pas)
mongoose
  .connect("mongodb://localhost/produit-service")
  .then(() => console.log(`produit-Service DB Connected`))
  .catch((err) => console.error("Could not connect to MongoDB:", err));
//La méthode save() renvoie une Promise.
//Ainsi, dans le bloc then(), nous renverrons une réponse de réussite avec un code 201 de réussite.
//Dans le bloc catch () , nous renverrons une réponse avec l'erreur générée par Mongoose ainsi qu'un code d'erreur 400.

// POST /produit/ajouter : Ajoute un nouveau produit
app.post("/produit/ajouter", isAuthenticated, (req, res) => {
  const { nom, description, prix, stock } = req.body;
  const newProduit = new Produit({
    nom,
    description,
    prix,
    stock,
  });
  newProduit
    .save()
    .then((produit) => res.status(201).json(produit))
    .catch((error) => res.status(400).json({ error }));
});

// GET /produit/:id : Récupère un produit spécifique
app.get("/produit/:id", async (req, res) => {
  try {
    const produit = await Produit.findById(req.params.id);
    if (!produit) {
      return res.status(404).json({ message: "Produit introuvable" });
    }
    return res.status(200).json(produit);
  } catch (error) {
    return res.status(400).json({ error });
  }
});

// PATCH /produit/:id/stock : Met à jour le stock d'un produit après une commande
app.patch("/produit/:id/stock", isAuthenticated, async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined) {
      return res.status(400).json({ message: "Le stock est requis" });
    }

    const produit = await Produit.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true }
    );

    if (!produit) {
      return res.status(404).json({ message: "Produit introuvable" });
    }

    return res.status(200).json(produit);
  } catch (error) {
    return res.status(400).json({ error });
  }
});

app.post("/produit/acheter", (req, res, next) => {
  const { ids } = req.body;
  Produit.find({ _id: { $in: ids } })
    .then((produits) => res.status(201).json(produits))
    .catch((error) => res.status(400).json({ error }));
});

app.listen(PORT, () => {
  console.log(`Product-Service at ${PORT}`);
});
