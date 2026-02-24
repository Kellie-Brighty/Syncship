<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { Eye, EyeOff } from 'lucide-svelte';

	interface Props extends HTMLInputAttributes {
		label?: string;
		error?: string;
		id?: string;
		value?: string;
	}

	let {
		label,
		error,
		id = crypto.randomUUID(),
		type,
		value = $bindable(''),
		class: className = '',
		...rest
	}: Props = $props();

	let showPassword = $state(false);
	let isPassword = $derived(type === 'password');
	let computedType = $derived(isPassword && showPassword ? 'text' : type);
</script>

<div class="space-y-1.5">
	{#if label}
		<label for={id} class="block text-sm font-medium text-gray-700">
			{label}
		</label>
	{/if}

	<div class="relative">
		<input
			{id}
			type={computedType}
			bind:value
			class="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 sm:text-sm {isPassword ? 'pr-10' : ''} {className}"
			{...rest}
		/>

		{#if isPassword}
			<button
				type="button"
				onclick={() => showPassword = !showPassword}
				class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
				tabindex={-1}
			>
				{#if showPassword}
					<EyeOff class="h-4 w-4" />
				{:else}
					<Eye class="h-4 w-4" />
				{/if}
			</button>
		{/if}
	</div>

	{#if error}
		<p class="text-sm text-red-600" id="{id}-error">{error}</p>
	{/if}
</div>
