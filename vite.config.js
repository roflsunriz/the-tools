"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
exports.default = (0, vite_1.defineConfig)({
    base: './',
    root: '.',
    publicDir: 'public',
    build: {
        outDir: 'frontend-dist',
        emptyOutDir: true,
        sourcemap: true,
        minify: false,
        rollupOptions: {
            input: 'front-src/index.html',
        },
    },
});
