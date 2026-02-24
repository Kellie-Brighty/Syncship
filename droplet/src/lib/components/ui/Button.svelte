<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		children?: Snippet;
	}

	let {
		variant = 'primary',
		size = 'md',
		class: className = '',
		children,
		...rest
	}: Props = $props();

	const baseStyles =
		'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 cursor-pointer';

	const variants = {
		primary: 'bg-gray-900 text-white hover:bg-gray-800',
		secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
		outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
		ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
		danger: 'bg-red-600 text-white hover:bg-red-700'
	};

	const sizes = {
		sm: 'h-8 px-3 text-xs gap-1.5',
		md: 'h-10 px-4 py-2 text-sm gap-2',
		lg: 'h-12 px-6 text-base gap-2.5'
	};
</script>

<button class="{baseStyles} {variants[variant]} {sizes[size]} {className}" {...rest}>
	{@render children?.()}
</button>
