const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const LivraisonSchema = mongoose.Schema({
  commande_id: String,
  transporteur_id: String,
  statut: {
    type: String,
    enum: ["En attente", "En cours", "Livrée"],
    default: "En attente",
  },
  adresse_livraison: String,
  created_at: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = Livraison = mongoose.model("livraison", LivraisonSchema);
