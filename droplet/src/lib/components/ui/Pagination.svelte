<script lang="ts">
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';

	interface Props {
		currentPage: number;
		totalItems: number;
		pageSize: number;
		onPageChange: (page: number) => void;
		loading?: boolean;
	}

	let { currentPage, totalItems, pageSize, onPageChange, loading = false }: Props = $props();

	let totalPages = $derived(Math.ceil(totalItems / pageSize));
	let canGoPrev = $derived(currentPage > 1);
	let canGoNext = $derived(currentPage < totalPages);

	// Generate page numbers to show
	let pagesToShow = $derived(() => {
		const pages: (number | string)[] = [];
		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i++) pages.push(i);
		} else {
			if (currentPage <= 4) {
				pages.push(1, 2, 3, 4, 5, '...', totalPages);
			} else if (currentPage >= totalPages - 3) {
				pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
			} else {
				pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
			}
		}
		return pages;
	});
</script>

{#if totalPages > 1}
	<div class="flex items-center justify-between px-4 py-3 sm:px-6 border-t border-gray-100 bg-gray-50/50">
		<div class="flex flex-1 justify-between sm:hidden">
			<button
				onclick={() => canGoPrev && onPageChange(currentPage - 1)}
				disabled={!canGoPrev || loading}
				class="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				Previous
			</button>
			<button
				onclick={() => canGoNext && onPageChange(currentPage + 1)}
				disabled={!canGoNext || loading}
				class="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				Next
			</button>
		</div>
		<div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
			<div>
				<p class="text-xs text-gray-500 font-medium">
					Showing <span class="font-bold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> to <span class="font-bold text-gray-900">{Math.min(currentPage * pageSize, totalItems)}</span> of <span class="font-bold text-gray-900">{totalItems}</span> results
				</p>
			</div>
			<div>
				<nav class="isolate inline-flex -space-x-px rounded-lg shadow-sm bg-white border border-gray-200" aria-label="Pagination">
					<button
						onclick={() => canGoPrev && onPageChange(currentPage - 1)}
						disabled={!canGoPrev || loading}
						class="relative inline-flex items-center rounded-l-lg px-2 py-2 text-gray-400 ring-1 ring-inset ring-transparent hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-40 transition-colors"
					>
						<span class="sr-only">Previous</span>
						<ChevronLeft class="h-4 w-4" />
					</button>
					
					{#each pagesToShow() as page}
						{#if typeof page === 'number'}
							<button
								onclick={() => onPageChange(page)}
								disabled={loading}
								class="relative inline-flex items-center px-4 py-2 text-xs font-bold transition-all {currentPage === page 
									? 'z-10 bg-indigo-600 text-white ring-1 ring-inset ring-indigo-600' 
									: 'text-gray-900 ring-1 ring-inset ring-transparent hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}"
							>
								{page}
							</button>
						{:else}
							<span class="relative inline-flex items-center px-4 py-2 text-xs font-medium text-gray-500 ring-1 ring-inset ring-transparent">...</span>
						{/if}
					{/each}

					<button
						onclick={() => canGoNext && onPageChange(currentPage + 1)}
						disabled={!canGoNext || loading}
						class="relative inline-flex items-center rounded-r-lg px-2 py-2 text-gray-400 ring-1 ring-inset ring-transparent hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-40 transition-colors"
					>
						<span class="sr-only">Next</span>
						<ChevronRight class="h-4 w-4" />
					</button>
				</nav>
			</div>
		</div>
	</div>
{/if}
