import './shim.js';

(function(pipette) {
  const save = colors => localStorage.setItem('picked-colors', JSON.stringify(colors))
  const load = () => JSON.parse(localStorage.getItem('picked-colors') || '[]')

  const colorPickerBtn = document.querySelector('#color-picker')
  const colorList = document.querySelector('.all-colors')
  const clearAll = document.querySelector('.clear-all')

  pipette.colors = load()

  clearAll.addEventListener('click', () => {
    document.querySelector('.picked-colors').classList.add('hide')
    save(pipette.colors = [])
  })

  colorPickerBtn.addEventListener('click', async () => {
    const { promise } = pipette.open(
      () => {
        save(pipette.colors)
        showColor()
      },
      ({ reason }) => {
        alert(reason)
      }
    )

    await promise
  })

  showColor()

  function showColor()
  {
    if (!pipette.colors.length) return

    colorList.innerHTML = pipette.colors.map(color => `
      <li class="color">
          <span class="rect" style="background: ${color}; border: 1px solid ${color === "#ffffff" ? "#ccc": color}"></span>
          <span class="value hex" data-color="${color}">${color}</span>
      </li>
    `).join('')

    document.querySelector('.picked-colors').classList.remove('hide')

    document.querySelector('.all-colors')
      .addEventListener('click', e => {
        const li = e.target.closest('li')

        li && copyColor(li.lastElementChild)
      })
  }

  async function copyColor(elem)
  {
    try {
      await navigator.clipboard.writeText(elem.dataset.color)

      elem.innerText = 'Copied'
    } catch (e) {
      elem.innerText = 'Error'
    }

    setTimeout(() => {
      elem.innerText = elem.dataset.color
    }, 1000)
  }

// https://developer.chrome.com/articles/eyedropper
})(new class ColorPipette extends EyeDropper
{
  constructor(colors)
  {
    super()

    this.colors = colors ?? []
  }

  // https://stackoverflow.com/questions/49974145/how-to-convert-rgba-to-hex-color-code-using-javascript
  toHex(rgba)
  {
    rgba = rgba.replace(/^rgba?\(|\s+|\)$/g, '').split(',')

    return `#${((1 << 24) +
      (parseInt(rgba[0]) << 16) +
      (parseInt(rgba[1]) << 8) +
      (parseInt(rgba[2]))
    ).toString(16).slice(1)}`
  }

  open(resolve = () => {}, reject = () => {})
  {
    const abortController = new AbortController()

    return {
      abortController,

      promise: (async () => {
        try {

          // https://developer.mozilla.org/en-US/docs/Web/API/EyeDropper
          const { sRGBHex } = await super.open({ signal: abortController.signal })

          // https://github.com/WICG/eyedropper-api/issues/28
          const hex = this.toHex(sRGBHex)

          await navigator.clipboard.writeText(hex)

          // Adding the color to the list if it doesn't already exist
          if (!this.colors.includes(hex)) {
            this.colors.push(hex)
          }

          resolve(this)

        } catch (error) {
          const msg = error.message.split(':')

          switch (true) {
            case ColorPipette.fake:
              reject({ reason: 'Your browser does not support the EyeDropper API' })
              break
            case msg.length >= 2:
              reject({ reason: msg[msg.length - 1] })
              break
            default:
              reject({ reason: 'Failed to copy the color code!' })
          }
        }
      })()
    }
  }
})
