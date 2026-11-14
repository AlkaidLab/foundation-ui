<script setup>
import MIcon from './MIcon.vue'

// A path drawn as a chain of nodes (display, encoder, network, client; application, capture device, stream): the shape
// of the data is the picture. A node is lit while it works, dimmed while its setting is off, and marked when it needs
// attention; `flow` animates the links between lit nodes, for a path that carries data right now.
defineProps({
  /** [{ id, icon, title, text?, state?: 'on' | 'off' | 'warn' }] */
  nodes: { type: Array, required: true },
  label: { type: String, default: '' },
  flow: { type: Boolean, default: false },
})
</script>

<template>
  <ol class="m-route" :aria-label="label">
    <template v-for="(node, index) in nodes" :key="node.id">
      <li v-if="index" class="m-route__link" :class="{ 'is-flow': flow && node.state !== 'off' && nodes[index - 1].state !== 'off', 'is-off': node.state === 'off' || nodes[index - 1].state === 'off' }" aria-hidden="true"><i /></li>
      <li class="m-route__node" :class="`is-${node.state || 'on'}`">
        <span class="m-route__ico"><MIcon :name="node.icon" fill /></span>
        <span class="m-route__title">{{ node.title }}</span>
        <small v-if="node.text" class="m-route__text">{{ node.text }}</small>
      </li>
    </template>
  </ol>
</template>
