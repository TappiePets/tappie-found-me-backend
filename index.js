
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const SHOPIFY_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP_NAME;

app.get('/mark-found', async (req, res) => {
  const handle = req.query.handle;
  if (!handle) return res.status(400).send("Missing 'handle'");

  try {
    // Fetch all pages
    const pages = await axios.get(`https://${SHOPIFY_SHOP}.myshopify.com/admin/api/2023-10/pages.json`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN
      }
    });

    const page = pages.data.pages.find(p => p.handle === handle);
    if (!page) return res.status(404).send("Page not found");

    // Fetch existing metafields for the page
    const metafieldsRes = await axios.get(`https://${SHOPIFY_SHOP}.myshopify.com/admin/api/2023-10/pages/${page.id}/metafields.json`, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN
      }
    });

    const lostStatusField = metafieldsRes.data.metafields.find(mf => mf.namespace === 'custom' && mf.key === 'lost_status');

    if (!lostStatusField) return res.status(404).send("Lost status metafield not found");

    // Update it via PUT
    await axios.put(`https://${SHOPIFY_SHOP}.myshopify.com/admin/api/2023-10/metafields/${lostStatusField.id}.json`, {
      metafield: {
        id: lostStatusField.id,
        value: false,
        type: 'boolean'
      }
    }, {
      headers: {
        'X-Shopify-Access-Token': SHOPIFY_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    res.send("✅ Pet marked as found!");
  } catch (error) {
    console.error(error?.response?.data || error.message);
    res.status(500).send("Something went wrong.");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
