import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

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
	test: { include: ['tests/**/*.test.ts'] },
	server: {
		// In development the API runs separately (npm run api).
		proxy: { '/api': 'http://localhost:8787' }
	}
});
