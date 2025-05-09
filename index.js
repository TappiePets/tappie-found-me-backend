const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP_NAME;
const METAOBJECT_TYPE = "pet_profile";

async function updateLostStatus(handle, status, res) {
  console.log("▶️ Request to mark", handle, "as", status ? "LOST" : "FOUND");

  const graphqlEndpoint = `https://${SHOPIFY_SHOP}.myshopify.com/admin/api/2023-10/graphql.json`;

  const query = `
    query GetMetaobjectByHandle($handle: String!) {
      metaobject(handle: {handle: $handle, type: "${METAOBJECT_TYPE}"}) {
        id
        fields {
          key
          value
        }
      }
    }
  `;

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

  try {
    const lookup = await axios.post(
      graphqlEndpoint,
      {
        query,
        variables: { handle }
      },
      {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_TOKEN,
          "Content-Type": "application/json"
        }
      }
    );

    const entry = lookup.data.data.metaobject;

    if (!entry) {
      console.log("❌ Metaobject not found for handle:", handle);
      return res.status(404).send("Metaobject not found.");
    }

    const update = await axios.post(
      graphqlEndpoint,
      {
        query: mutation,
        variables: {
          id: entry.id,
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

    console.log("✅ Metaobject updated:", entry.id);
    res.send(`Pet marked as ${status ? "LOST" : "FOUND"}`);
  } catch (err) {
    console.error("❌ Error:", err?.response?.data || err.message);
    res.status(500).send("Something went wrong.");
  }
}

app.get('/mark-lost', async (req, res) => {
  const handle = req.query.handle;
  if (!handle) return res.status(400).send("Missing 'handle'");
  await updateLostStatus(handle, true, res);
});

app.get('/mark-found', async (req, res) => {
  const handle = req.query.handle;
  if (!handle) return res.status(400).send("Missing 'handle'");
  await updateLostStatus(handle, false, res);
});

app.listen(PORT, () => {
  console.log(`🐶 Metaobject GraphQL server running on port ${PORT}`);
});