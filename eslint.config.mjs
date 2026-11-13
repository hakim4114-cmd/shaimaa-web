import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// merchant-os/ is a separate app with its own lint config.
const eslintConfig = [...nextVitals, ...nextTypescript, { ignores: ["merchant-os/**"] }];

export default eslintConfig;
