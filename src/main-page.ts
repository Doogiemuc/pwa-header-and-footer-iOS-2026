import { createApp } from 'vue'
import './style.css'
import PageScrollView from './views/PageScrollView.vue'

// Old links used ?scroll=inner on this page; the inner view is its own page now.
if (new URLSearchParams(location.search).get('scroll') === 'inner') {
  location.replace(new URL('inner.html' + location.search, location.href))
} else {
  createApp(PageScrollView).mount('#app')
}
