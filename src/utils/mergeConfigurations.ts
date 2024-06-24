import localConfig from '../../app.config.json';
import axios from 'axios';

//@ts-ignore
const deepMerge = (target, ...sources): any => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return deepMerge(target, ...sources);
};

const isObject = (item: any) => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

const fetchOverrideConfig = async () => {
  try {
    let deploymentIdConfig = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${process.env.NEXT_PUBLIC_CONFIG_BASE_URL}`,
      headers: {
        accept: 'application/json',
      },
    };
    const deploymentResp = await axios.request(deploymentIdConfig);

    return deploymentResp?.data?.data?.config;
  } catch (err) {
    console.error(err);
  }
  return {};
};

const mergeConfiguration = async () => {
  let overrideConfig: any = {};
  try {
    // const response = await axios.get('URL_TO_FETCH_OVERRIDE_CONFIG');
    overrideConfig = await fetchOverrideConfig();

    //overrideConfig = response.data;
  } catch (error) {
    console.error('Error fetching override configuration:', error);
    // Optionally handle error, such as falling back to default configs
  }

  const mergedConfig = await deepMerge({}, localConfig, overrideConfig);

  return mergedConfig;
};
export default mergeConfiguration;
