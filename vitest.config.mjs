import { configDefaults, defineConfig } from "vitest/config";

// merchant-os/ is a separate app with its own test setup.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "merchant-os/**"]
  }
});
