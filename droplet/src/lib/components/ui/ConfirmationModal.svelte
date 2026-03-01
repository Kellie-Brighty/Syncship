<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from './Button.svelte';
	import { AlertTriangle, Info, CheckCircle2 } from 'lucide-svelte';

	interface Props {
		show: boolean;
		title: string;
		message: string;
		confirmText?: string;
		cancelText?: string;
		type?: 'info' | 'warning' | 'success';
		loading?: boolean;
		onConfirm: () => void;
		onCancel: () => void;
	}

	let { 
		show = $bindable(), 
		title, 
		message, 
		confirmText = 'Confirm', 
		cancelText = 'Cancel', 
		type = 'info',
		loading = false,
		onConfirm, 
		onCancel 
	}: Props = $props();

	const icons = {
		info: { component: Info, color: 'text-blue-600', bg: 'bg-blue-100' },
		warning: { component: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
		success: { component: CheckCircle2, color: 'text-green-600', bg: 'bg-green-100' }
	};

	const activeIcon = $derived(icons[type]);
</script>

<Modal bind:show onClose={onCancel} maxWidth="max-w-md">
	<div class="flex flex-col items-center text-center">
		<div class="mb-4 rounded-full {activeIcon.bg} p-3">
			<activeIcon.component class="h-6 w-6 {activeIcon.color}" />
		</div>
		
		<h3 class="mb-2 text-lg font-bold text-gray-900">{title}</h3>
		<p class="mb-8 text-sm text-gray-500 leading-relaxed">
			{message}
		</p>

		<div class="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
			<Button 
				variant="outline" 
				class="w-full sm:w-32" 
				onclick={onCancel}
				disabled={loading}
			>
				{cancelText}
			</Button>
			<Button 
				class="w-full sm:w-32 {type === 'warning' ? 'bg-amber-600 hover:bg-amber-700' : ''}" 
				onclick={onConfirm}
				{loading}
			>
				{confirmText}
			</Button>
		</div>
	</div>
</Modal>
