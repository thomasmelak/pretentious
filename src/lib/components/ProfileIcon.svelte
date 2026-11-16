<!-- One small drawing per flavour profile. -->
<script lang="ts">
	import type { Profile } from '#lib/shared/types.ts';

	let { profile, size = 20 }: { profile: Profile; size?: number } = $props();
</script>

<svg
	class="profile-icon"
	viewBox="0 0 24 24"
	width={size}
	height={size}
	fill="none"
	stroke="currentColor"
	stroke-width="1.4"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if profile === 'stirred'}
		<!-- A bar spoon, twisted. -->
		<path d="M12 2.5v14" />
		<path d="M10.2 5.5l3.6 1.6M10.2 9l3.6 1.6M10.2 12.5l3.6 1.6" />
		<path d="M9.5 18.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0z" />
	{:else if profile === 'sour'}
		<!-- A citrus wheel. -->
		<circle cx="12" cy="12" r="9" />
		<circle cx="12" cy="12" r="6.3" />
		<path d="M12 5.7v12.6M5.7 12h12.6M7.5 7.5l9 9M16.5 7.5l-9 9" />
	{:else if profile === 'bitter'}
		<!-- A drop of bitters. -->
		<path d="M12 3c4.2 5 6.2 8.4 6.2 11.2a6.2 6.2 0 0 1-12.4 0C5.8 11.4 7.8 8 12 3z" />
		<path d="M9.2 14.5a3 3 0 0 0 2.6 2.8" />
	{:else if profile === 'long'}
		<!-- Bubbles. -->
		<circle cx="9" cy="16.5" r="3.5" />
		<circle cx="15.5" cy="9.5" r="2.5" />
		<circle cx="9.5" cy="6" r="1.5" />
		<circle cx="17" cy="17" r="1.3" />
	{:else}
		<!-- A coffee bean. -->
		<ellipse cx="12" cy="12" rx="6.5" ry="9" transform="rotate(30 12 12)" />
		<path d="M8.6 6.8c3.4 2.4 3.4 7.4 6.8 10.4" />
	{/if}
</svg>

<style>
	.profile-icon {
		display: inline-block;
		flex: none;
		vertical-align: -4px;
	}
</style>
