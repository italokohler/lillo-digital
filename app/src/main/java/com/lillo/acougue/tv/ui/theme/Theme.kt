package com.lillo.acougue.tv.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color
import com.lillo.acougue.tv.data.model.ThemeMode

private val DarkScheme = darkColorScheme(
    primary = BrandGold,
    onPrimary = Color(0xFF191103),
    secondary = BrandOrange,
    onSecondary = Color(0xFF1A1002),
    background = BrandDark,
    onBackground = Color.White,
    surface = SurfaceDark,
    onSurface = Color.White,
    surfaceVariant = SurfaceDarker,
    onSurfaceVariant = Color(0xFFD5DCE6),
)

private val LightScheme = lightColorScheme(
    primary = BrandRed,
    onPrimary = Color.White,
    secondary = BrandOrange,
    onSecondary = Color(0xFF241503),
    background = SurfaceLight,
    onBackground = Color(0xFF111318),
    surface = Color.White,
    onSurface = Color(0xFF111318),
    surfaceVariant = SurfaceMuted,
    onSurfaceVariant = Color(0xFF313843),
)

@Immutable
data class MeatTvColors(
    val background: Color,
    val onBackground: Color,
    val surface: Color,
    val onSurface: Color,
)

object MeatTvPalette {
    val colors: MeatTvColors
        @Composable
        get() = MeatTvColors(
            background = MaterialTheme.colorScheme.background,
            onBackground = MaterialTheme.colorScheme.onBackground,
            surface = MaterialTheme.colorScheme.surface,
            onSurface = MaterialTheme.colorScheme.onSurface,
        )
}

@Composable
fun MeatTvTheme(
    themeMode: ThemeMode = ThemeMode.DARK,
    content: @Composable () -> Unit,
) {
    val colorScheme = when (themeMode) {
        ThemeMode.DARK -> DarkScheme
        ThemeMode.LIGHT -> LightScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = MeatTvTypography,
        content = content,
    )
}
