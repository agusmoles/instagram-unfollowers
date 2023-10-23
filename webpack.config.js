const path = require("path");

module.exports = {
  entry: "./src/main.tsx",
  module: {
    rules: [
      {
        test: /\.ts|\.tsx$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
    alias: {
      react: "preact/compat",
      "react-dom": "preact/compat",
    },
  },
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
  },
};
