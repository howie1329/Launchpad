<script lang="ts">
	import type { ComponentRenderProps } from '@openuidev/svelte-lang';

	type Cell = string | number | boolean;
	let { props }: ComponentRenderProps<{ columns: string[]; rows: Cell[][] }> = $props();
</script>

<div class="max-w-full overflow-x-auto rounded-md border border-border/70">
	<table class="w-full min-w-max border-collapse text-left text-[13px] leading-5">
		<thead class="bg-muted/60 text-muted-foreground">
			<tr>
				{#each props.columns as column, index (`${column}-${index}`)}
					<th class="border-b border-border/70 px-3 py-2 font-medium">{column}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each props.rows as row, rowIndex (rowIndex)}
				<tr class="border-b border-border/50 last:border-0">
					{#each props.columns as column, index (`${column}-${index}`)}
						<td class="px-3 py-2 align-top">{String(row[index] ?? '')}</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
