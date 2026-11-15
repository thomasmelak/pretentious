import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// A static, client-rendered app. Hash routing lets it live on any static
			// host and at any path without server rewrites.
			adapter: adapter({ fallback: 'index.html' }),
			router: { type: 'hash' },
			paths: { relative: true }
		})
	],
	server: {
		// In development the API runs separately (deno task api).
		proxy: { '/api': 'http://localhost:8000' }
	}
});
