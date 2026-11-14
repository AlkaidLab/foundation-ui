<script>
import { defineComponent, onBeforeUnmount, watch } from 'vue'
import { useNotify } from '../notify/store.js'

// Snackbar: a short confirmation, optionally with one action. The window has one place and one queue for them (MNotifyHost); this component only hands the
// message over when `modelValue` becomes true and sets it back to false, so every caller keeps its `v-model`.
export default defineComponent({
  name: 'MSnackbar',
  props: {
    modelValue: { type: Boolean, default: false },
    message: { type: String, default: '' },
    action: { type: String, default: '' },
    timeout: { type: Number, default: 5000 },
  },
  emits: ['update:modelValue', 'action'],
  setup(props, { emit }) {
    const notify = useNotify()
    const stop = watch(() => props.modelValue, (open) => {
      if (!open) return
      if (props.message) notify.snack(props.message, { action: props.action, timeout: props.timeout, onAction: () => emit('action') })
      emit('update:modelValue', false)
    }, { immediate: true })
    onBeforeUnmount(stop)
    return () => null
  },
})
</script>
