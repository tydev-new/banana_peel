// M1 function: mockExtract - pretend to call backend and return mock assets
export async function mockExtract(img: Blob) {
  const backgroundPng = await blobToB64(img)
  return {
    backgroundPng,
    elements: [
      {
        id: 'elem-01',
        png: backgroundPng,
        bbox: { x: 20, y: 20, w: 200, h: 200 },
      },
    ],
  }
}

// M1 function: blobToB64 - convert imported blob into base64 payload
async function blobToB64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const [, base64 = ''] = result.split(',')
      resolve(base64)
    }
    reader.readAsDataURL(blob)
  })
}
