import { defineConfig, UserConfigExport } from "@tarojs/cli";

const config: UserConfigExport = {
  projectName: "hentor-vegetables-miniapp",
  date: "2026-06-17",
  designWidth: 375,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: "src",
  outputRoot: "dist",
  plugins: ["@tarojs/plugin-framework-react", "@tarojs/plugin-platform-weapp"],
  framework: "react",
  compiler: "webpack5",
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: "module",
          generateScopedName: "[name]__[local]___[hash:base64:5]",
        },
      },
    },
  },
  h5: {},
};

export default defineConfig(async (merge) => {
  const envConfig =
    process.env.NODE_ENV === "production"
      ? await import("./prod")
      : await import("./dev");

  return merge({}, config, envConfig.default);
});
