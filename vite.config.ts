import { defineConfig } from 'vite';

export default defineConfig({
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


