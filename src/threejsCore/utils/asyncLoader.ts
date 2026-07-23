import { Texture, TextureLoader, SRGBColorSpace } from 'three'

/**
 * 解析路径
 * @param url
 * @returns
 */
export function resolveResourceUrl(url: string): string {
  if (/^(https?:|data:|blob:)/i.test(url)) return url

  const baseUrl = String(import.meta.env.VITE_IMAGE_URL ?? '').replace(/\/$/, '')
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`
  return `${baseUrl}${normalizedUrl}`
}

/**
 * 加载材质
 * @param url
 * @returns
 */
export async function asyncLoaderTexture(url: string = ''): Promise<Texture | null> {
  if (!url.trim()) return null

  try {
    const texture = await new TextureLoader().loadAsync(resolveResourceUrl(url))
    texture.colorSpace = SRGBColorSpace
    return texture
  } catch (error) {
    console.warn(`Failed to load map face texture "${url}".`, error)
    return null
  }
}
