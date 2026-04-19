# Image Export and Print

Mauve Viewer lets you save the current alignment view as an image file or print it directly from the browser.

## Image Export

Press **Ctrl + E** or select **Export Image** from the Export menu to open the image export dialog.

### Format

Choose between two image formats:

| Format | Characteristics |
|--------|----------------|
| PNG | Lossless compression, supports transparency |
| JPEG | Lossy compression, white background applied (no transparency) |

### Quality (JPEG Only)

When exporting as JPEG, select a quality level:

| Quality | Compression |
|---------|-------------|
| Low | 50% quality — smaller file size |
| Medium | 75% quality — balanced |
| High | 95% quality — best visual fidelity (default) |

The quality selector is hidden when PNG is selected.

### Dimensions

Set the output image dimensions in pixels:

- **Width**: 100 to 10,000 pixels
- **Height**: 100 to 10,000 pixels
- Default values match the current viewer dimensions

The alignment is re-rendered at the specified dimensions, so higher values produce more detailed output.

<!-- screenshot: image export dialog with format, quality, and dimension fields -->

## Print

Press **Ctrl + P** or select **Print** from the Export menu to open the browser print dialog. The alignment is formatted with a landscape-optimized print stylesheet for best results on paper.
