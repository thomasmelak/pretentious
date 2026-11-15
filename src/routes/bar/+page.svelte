<script lang="ts">
	import { goto } from '$app/navigation';

	$effect(() => {
		goto('#/bar/inventory', { replaceState: true });
	});
</script>
