<script setup>
import { ref } from 'vue'
import MIcon from './MIcon.vue'

// Four digit boxes and the button on one line: the PIN a client shows is typed here. One real input over the boxes (a paste and the keyboard of a phone work).
defineProps({ label: { type: String, default: 'PIN' }, go: { type: String, default: 'Pair' }, disabled: { type: Boolean, default: false } })
const emit = defineEmits(['submit'])
const pin = ref('')
const focus = ref(false)
const onInput = (e) => { pin.value = String(e.target.value).replace(/\D/g, '').slice(0, 4); e.target.value = pin.value }
const send = () => { if (pin.value.length === 4) { emit('submit', pin.value); pin.value = '' } }
</script>

<template>
  <div class="m-dpair__entry m-pinentry">
    <label class="m-dpair__digits" :class="{ 'is-focus': focus, 'is-off': disabled }">
      <i v-for="k in 4" :key="k" :class="{ 'is-next': focus && pin.length === k - 1, 'is-filled': pin.length >= k }">{{ pin.charAt(k - 1) }}</i>
      <input class="m-dpair__pin" type="text" inputmode="numeric" autocomplete="off" maxlength="4" :aria-label="label" :value="pin" :disabled="disabled" @input="onInput" @keydown.enter="send" @focus="focus = true" @blur="focus = false">
    </label>
    <button type="button" class="m-dpill m-dpill--fill m-dpair__go" :disabled="pin.length < 4 || disabled" :aria-label="go" @click="send"><MIcon name="check" /><span>{{ go }}</span></button>
  </div>
</template>
