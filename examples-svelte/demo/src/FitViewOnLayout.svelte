<script lang="ts">
  import { useSvelteFlow } from "@xyflow/svelte";

  export let trigger = 0;

  const { fitView } = useSvelteFlow();

  $: if (trigger > 0) {
    requestAnimationFrame(() => {
      fitView({ duration: 200 });
    });
  }
</script>
