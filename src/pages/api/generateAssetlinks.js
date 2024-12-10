const axios = require('axios');
const fs = require('fs');

async function generateAssetlinks() {
  try {
    const configUrl = `${process.env.NEXT_PUBLIC_CONFIG_BASE_URL}`;
    const res = await axios.get(configUrl);

    const apiData = res.data.data.config.component.assetLinks;

    const assetlinksTemplate = apiData.map((item) => ({
      relation: item.relation || [],
      target: {
        namespace: 'android_app',
        package_name: item.target?.package_name || '',
        sha256_cert_fingerprints: item.target?.sha256_cert_fingerprints || [],
      },
    }));

    const wellKnownDir = './public/.well-known';
    if (!fs.existsSync(wellKnownDir)) {
      fs.mkdirSync(wellKnownDir, { recursive: true });
    }

    fs.writeFileSync(
      `${wellKnownDir}/assetlinks.json`,
      JSON.stringify(assetlinksTemplate, null, 2)
    );
    console.log('assetlinks.json has been successfully created!');
  } catch (error) {
    console.error('Failed to generate assetlinks.json:', error.message);
  }
}

generateAssetlinks();
