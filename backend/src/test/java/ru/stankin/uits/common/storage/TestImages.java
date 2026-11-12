package ru.stankin.uits.common.storage;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.Locale;
import java.util.Random;

final class TestImages {

    private TestImages() {
    }

    static byte[] photoPng(int width, int height, boolean withTransparentCorner) throws IOException {
        int type = withTransparentCorner ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB;
        BufferedImage image = new BufferedImage(width, height, type);
        Random random = new Random(7);

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int noise = random.nextInt(24) - 12;
                int red = channel(x * 255 / width + noise);
                int green = channel(y * 255 / height + noise);
                int blue = channel((x + y) * 255 / (width + height) + noise);
                boolean transparent = withTransparentCorner && x < width / 4 && y < height / 4;
                int alpha = transparent ? 0 : 0xFF;

                image.setRGB(x, y, alpha << 24 | red << 16 | green << 8 | blue);
            }
        }

        return write(image, "png");
    }

    static byte[] photoPngWithAlphaChannel(int width, int height, int lastPixelAlpha) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        Random random = new Random(7);

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int noise = random.nextInt(24) - 12;
                int red = channel(x * 255 / width + noise);
                int green = channel(y * 255 / height + noise);
                int blue = channel((x + y) * 255 / (width + height) + noise);
                boolean last = x == width - 1 && y == height - 1;
                int alpha = last ? lastPixelAlpha : 0xFF;

                image.setRGB(x, y, alpha << 24 | red << 16 | green << 8 | blue);
            }
        }

        return write(image, "png");
    }

    static byte[] flatPng(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();

        try {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, width, height);
            graphics.setColor(new Color(0, 90, 170));
            graphics.fillRect(width / 10, height / 10, width / 2, height / 4);
            graphics.setColor(new Color(220, 60, 40));
            graphics.fillRect(width / 3, height / 2, width / 2, height / 3);
        } finally {
            graphics.dispose();
        }

        return write(image, "png");
    }

    static String formatOf(byte[] data) throws IOException {
        try (ImageInputStream stream = ImageIO.createImageInputStream(new ByteArrayInputStream(data))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(stream);

            return readers.next().getFormatName().toLowerCase(Locale.ROOT);
        }
    }

    private static int channel(int value) {
        return Math.max(0, Math.min(255, value));
    }

    private static byte[] write(BufferedImage image, String format) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, format, out);

        return out.toByteArray();
    }
}
