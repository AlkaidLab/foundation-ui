<script setup>
import { computed } from 'vue'
import MSection from './MSection.vue'
import MGroup from './MGroup.vue'
import MItem from './MItem.vue'
import MButton from './MButton.vue'
import MFeedbackRow from './MFeedbackRow.vue'
import { useDevAccount } from './devmode/useDevAccount.js'
import { openDevSignIn } from './devmode/devReport.js'
import { devmodeTexts, fillText } from '../devmode/texts.js'

// 账号与反馈 in the settings of a product, for every user (developer mode or not): the GitHub account the feedback is sent under (connect, the signed-in account, disconnect) and the way to the feedback form.
// Signing in is the device flow of the report sheet (DevSignIn, mounted once at the root by DevReportHost); without the backend the row says 未配置 and the no-account path keeps working.
//   logs: the last log lines the feedback form should carry, when the page has them
const props = defineProps({ locale: { type: String, default: 'zh' }, logs: { type: String, default: '' }, title: { type: String, default: '' } })
const T = computed(() => devmodeTexts(props.locale))
const account = useDevAccount()
const configured = computed(() => account.backend().configured)
const signed = computed(() => account.signedIn.value)
</script>

<template>
  <MSection :title="title || T.acctTitle" data-feedback-account>
    <MGroup>
      <MItem icon="account_circle" wrap :title="T.acctGithub" :text="signed ? fillText(T.acctSigned, { login: account.login.value || '—' }) : configured ? T.acctOutSub : T.acctOff" data-account-row="github">
        <template #trail>
          <MButton v-if="signed" variant="outlined" size="sm" icon="link_off" data-account-action="disconnect" @click="account.signOut()">{{ T.disconnectGithub }}</MButton>
          <template v-else>
            <MButton variant="tonal" size="sm" icon="login" data-account-action="connect" @click="openDevSignIn">{{ T.connect }}</MButton>
          </template>
        </template>
      </MItem>
      <MFeedbackRow :locale="locale" :logs="logs" />
    </MGroup>
  </MSection>
</template>
