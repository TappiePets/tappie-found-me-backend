const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP_NAME;

const mutation = `
  mutation UpdateLostStatus($id: ID!, $lost: Boolean!) {
    metaobjectUpdate(id: $id, metaobject: {
      fields: [
        { key: "lost_status", value: $lost }
      ]
    }) {
      metaobject { id }
      userErrors { field, message }
    }
  }
`;

async function updateLostStatusById(id, status, res) {
  console.log("▶️ Updating Metaobject ID:", id, "to", status ? "LOST" : "FOUND");

  const graphqlEndpoint = `https://${SHOPIFY_SHOP}.myshopify.com/admin/api/2023-10/graphql.json`;

  try {
    const update = await axios.post(
      graphqlEndpoint,
      {
        query: mutation,
        variables: {
          id,
          lost: status
        }
      },
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    const errors = update.data.data.metaobjectUpdate.userErrors;
    if (errors.length > 0) {
      console.error("❌ Shopify errors:", errors);
      return res.status(500).send("Error updating lost_status.");
    }

    console.log("✅ Metaobject updated:", id);
    res.send(`Pet marked as ${status ? "LOST" : "FOUND"}`);
  } catch (err) {
    console.error("❌ Error:", err?.response?.data || err.message);
    res.status(500).send("Something went wrong.");
  }
}

app.get('/mark-lost', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send("Missing 'id'");
  await updateLostStatusById(id, true, res);
});

app.get('/mark-found', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).send("Missing 'id'");
  await updateLostStatusById(id, false, res);
});

app.listen(PORT, () => {
  console.log(`🆔 Metaobject ID-based GraphQL server running on port ${PORT}`);
});