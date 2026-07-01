<template>
  <div
    ref="containerRef"
    :style="{
      width: '100%',
      height: height || '500px',
      ...style
    }"
    :class="className"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, type PropType } from 'vue';

/**
 * db-grid Vue 3 包装器
 * 
 * 使用方式:
 * <DbGridVue :rowData="rowData" :columnDefs="columnDefs" @gridReady="onGridReady" />
 */

// Props 定义
const props = defineProps({
  // 数据属性
  rowData: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  columnDefs: {
    type: Array as PropType<any[]>,
    default: () => []
  },
  gridOptions: {
    type: Object as PropType<any>,
    default: () => ({})
  },
  
  // 样式
  height: {
    type: String,
    default: '500px'
  },
  style: {
    type: Object as PropType<Record<string, any>>,
    default: () => ({})
  },
  className: {
    type: String,
    default: ''
  }
});

// Emits 定义
const emit = defineEmits<{
  gridReady: [event: any];
  cellClick: [event: any];
  cellDoubleClick: [event: any];
  selectionChanged: [event: any];
  sortChanged: [event: any];
  filterChanged: [event: any];
  rowClicked: [event: any];
  rowDoubleClicked: [event: any];
}>();

// Refs
const containerRef = ref<HTMLDivElement | null>(null);
const gridElement = ref<any>(null);
const gridApi = ref<any>(null);
const scriptLoaded = ref(false);

// 生命周期
onMounted(() => {
  loadScript();
});

onUnmounted(() => {
  // 清理
  if (gridElement.value && gridElement.value.parentNode) {
    gridElement.value.parentNode.removeChild(gridElement.value);
  }
});

// 加载 db-grid 脚本
const loadScript = () => {
  if (scriptLoaded.value) {
    initGrid();
    return;
  }
  
  const script = document.createElement('script');
  script.src = `${import.meta.env.BASE_URL || ''}db-grid-elements.js`;
  script.onload = () => {
    scriptLoaded.value = true;
    initGrid();
  };
  script.onerror = () => {
    console.error('❌ Failed to load db-grid-elements.js');
  };
  document.head.appendChild(script);
};

// 初始化网格
const initGrid = () => {
  if (!containerRef.value) return;
  
  // 创建 <db-grid-element> 元素
  gridElement.value = document.createElement('db-grid-element');
  gridElement.value.style.width = '100%';
  gridElement.value.style.height = '100%';
  gridElement.value.style.display = 'block';
  
  // 设置属性
  gridElement.value.rowData = props.rowData;
  gridElement.value.columnDefs = props.columnDefs;
  gridElement.value.gridOptions = props.gridOptions;
  
  // 监听事件
  gridElement.value.addEventListener('gridReady', (event: any) => {
    gridApi.value = event.detail.api;
    emit('gridReady', event.detail);
  });
  
  gridElement.value.addEventListener('cellClick', (event: any) => {
    emit('cellClick', event.detail);
  });
  
  gridElement.value.addEventListener('cellDoubleClick', (event: any) => {
    emit('cellDoubleClick', event.detail);
  });
  
  gridElement.value.addEventListener('selectionChanged', (event: any) => {
    emit('selectionChanged', event.detail);
  });
  
  gridElement.value.addEventListener('sortChanged', (event: any) => {
    emit('sortChanged', event.detail);
  });
  
  gridElement.value.addEventListener('filterChanged', (event: any) => {
    emit('filterChanged', event.detail);
  });
  
  gridElement.value.addEventListener('rowClicked', (event: any) => {
    emit('rowClicked', event.detail);
  });
  
  gridElement.value.addEventListener('rowDoubleClicked', (event: any) => {
    emit('rowDoubleClicked', event.detail);
  });
  
  // 添加到容器
  containerRef.value.innerHTML = '';
  containerRef.value.appendChild(gridElement.value);
};

// 监听属性变化
watch(() => props.rowData, (newData) => {
  if (gridElement.value) {
    gridElement.value.rowData = newData;
  }
});

watch(() => props.columnDefs, (newCols) => {
  if (gridElement.value) {
    gridElement.value.columnDefs = newCols;
  }
});

// 公共方法
const getGridApi = (): any => {
  return gridApi.value;
};

const setRowData = (data: any[]): void => {
  if (gridElement.value) {
    gridElement.value.rowData = data;
  }
};

const setColumnDefs = (cols: any[]): void => {
  if (gridElement.value) {
    gridElement.value.columnDefs = cols;
  }
};

const exportToExcel = (fileName?: string): void => {
  if (gridApi.value) {
    gridApi.value.exportToExcel(fileName || 'export.xlsx');
  }
};

// 暴露方法给父组件
defineExpose({
  getGridApi,
  setRowData,
  setColumnDefs,
  exportToExcel
});
</script>

<style scoped>
/* 组件样式 */
</style>
