
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP_NAME;

async function updateLostStatus(handle, status, res) {
  console.log("▶️ Incoming request to mark", handle, "as", status ? "LOST" : "FOUND");

  try {
    const pagesRes = await axios.get(
      `https://${SHOPIFY_SHOP}.myshopify.com/admin/api/2023-10/pages.json`,
      {
        headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN }
      }
    );

    const page = pagesRes.data.pages.find(p => p.handle === handle);
    if (!page) {
      console.log("❌ Page not found for handle:", handle);
      return res.status(404).send("Page not found");
    }

    console.log("✅ Found page:", page.id, page.title);

    const metafieldsRes = await axios.get(
      `https://${SHOPIFY_SHOP}.myshopify.com/admin/api/2023-10/pages/${page.id}/metafields.json`,
      {
        headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN }
      }
    );

    const lostStatus = metafieldsRes.data.metafields.find(
      (mf) => mf.namespace === 'custom' && mf.key === 'lost_status'
    );

    if (lostStatus) {
      console.log("✏️ Updating existing metafield ID:", lostStatus.id);
      const updateRes = await axios.put(
        `https://${SHOPIFY_SHOP}.myshopify.com/admin/api/2023-10/metafields/${lostStatus.id}.json`,
        {
          metafield: {
            id: lostStatus.id,
            value: status,
            type: 'boolean'
          }
        },
        {
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log("✅ Update response:", updateRes.data);
    } else {
      console.log("➕ Creating new metafield for page ID:", page.id);
      const createRes = await axios.post(
        `https://${SHOPIFY_SHOP}.myshopify.com/admin/api/2023-10/metafields.json`,
        {
          metafield: {
            namespace: 'custom',
            key: 'lost_status',
            type: 'boolean',
            value: status,
            owner_resource: 'page',
            owner_id: page.id
          }
        },
        {
          headers: {
            'X-Shopify-Access-Token': SHOPIFY_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log("✅ Create response:", createRes.data);
    }

    res.send(`✅ Pet marked as ${status ? 'LOST' : 'FOUND'}!`);
  } catch (err) {
    console.error("❌ Error:", err?.response?.data || err.message);
    res.status(500).send("Something went wrong.");
  }
}

app.get('/mark-found', async (req, res) => {
  const handle = req.query.handle;
  if (!handle) return res.status(400).send("Missing 'handle'");
  await updateLostStatus(handle, false, res);
});

app.get('/mark-lost', async (req, res) => {
  const handle = req.query.handle;
  if (!handle) return res.status(400).send("Missing 'handle'");
  await updateLostStatus(handle, true, res);
});

app.listen(PORT, () => {
  console.log(`🐾 Debug server running on port ${PORT}`);
});
