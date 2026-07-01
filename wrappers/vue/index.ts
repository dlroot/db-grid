// db-grid Vue 3 包装器 - 导出文件

export { default as DbGridVue } from './DbGridVue.vue';

/**
 * 使用示例 (Vue 3 + TypeScript):
 * 
 * <template>
 *   <div>
 *     <DbGridVue
 *       :rowData="rowData"
 *       :columnDefs="columnDefs"
 *       @gridReady="onGridReady"
 *       style="height: 500px"
 *     />
 *   </div>
 * </template>
 * 
 * <script setup lang="ts">
 * import { ref } from 'vue';
 * import { DbGridVue } from 'db-grid/wrappers/vue';
 * 
 * const rowData = ref([...]);
 * const columnDefs = ref([...]);
 * 
 * const onGridReady = (event: any) => {
 *   console.log('Grid ready:', event.api);
 * };
 * </script>
 */
