declare module 'screenshot-desktop' {
  interface Options {
    filename?: string
    format?: 'png' | 'jpg'
    screen?: number
  }
  function screenshot(options?: Options): Promise<Buffer>
  export = screenshot
}
