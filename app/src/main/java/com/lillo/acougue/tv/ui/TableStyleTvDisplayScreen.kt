package com.lillo.acougue.tv.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ExperimentalAnimationApi
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import com.lillo.acougue.tv.R
import com.lillo.acougue.tv.data.model.CatalogConfig
import com.lillo.acougue.tv.data.model.CatalogPage
import com.lillo.acougue.tv.data.model.PageType
import com.lillo.acougue.tv.data.model.Product
import com.lillo.acougue.tv.data.model.displayPages
import java.text.NumberFormat
import java.util.Locale
import kotlinx.coroutines.delay

@OptIn(ExperimentalAnimationApi::class)
@Composable
fun TableStyleTvDisplayScreen(
    catalog: CatalogConfig? = null,
    fallbackMessage: String? = null,
) {
    val data = catalog ?: return FallbackBoard(message = fallbackMessage)
    val slides = remember(data) { data.displayPages() }
    if (slides.isEmpty()) {
        return FallbackBoard(message = "No catalog pages found.")
    }

    val focusRequester = remember { FocusRequester() }
    var slideIndex by rememberSaveable { mutableIntStateOf(0) }
    var paused by rememberSaveable { mutableStateOf(false) }

    val slideDuration = data.slideIntervalSeconds.coerceIn(10, 20)
    val currentSlide = slides[slideIndex % slides.size]
    val backdropAccent by animateColorAsState(
        targetValue = currentSlide.accentColor.toColor(),
        label = "backdrop_accent",
    )

    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
    }

    LaunchedEffect(currentSlide.id, paused, slideDuration, slides.size) {
        if (paused || currentSlide.type == PageType.VIDEO) return@LaunchedEffect
        delay(slideDuration * 1_000L)
        slideIndex = (slideIndex + 1) % slides.size
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.linearGradient(
                    listOf(
                        Color(0xFF120907),
                        Color(0xFF23120D),
                        Color(0xFF140B09),
                    ),
                ),
            )
            .focusRequester(focusRequester)
            .focusable()
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                when (event.key) {
                    Key.DirectionRight, Key.DirectionDown -> {
                        slideIndex = (slideIndex + 1) % slides.size
                        true
                    }

                    Key.DirectionLeft, Key.DirectionUp -> {
                        slideIndex = if (slideIndex == 0) slides.lastIndex else slideIndex - 1
                        true
                    }

                    Key.Enter, Key.NumPadEnter, Key.DirectionCenter, Key.MediaPlayPause -> {
                        paused = !paused
                        true
                    }

                    else -> false
                }
            },
    ) {
        BoardBackdrop(accent = backdropAccent)

        AnimatedContent(
            modifier = Modifier.fillMaxSize(),
            targetState = slideIndex,
            transitionSpec = {
                (
                    slideInHorizontally(
                        animationSpec = tween(620, easing = FastOutSlowInEasing),
                        initialOffsetX = { it },
                    ) + fadeIn(animationSpec = tween(420))
                ) togetherWith (
                    slideOutHorizontally(
                        animationSpec = tween(620, easing = FastOutSlowInEasing),
                        targetOffsetX = { -it / 6 },
                ) + fadeOut(animationSpec = tween(420))
                )
            },
            label = "board_slide",
        ) { index ->
            val slide = slides[index % slides.size]

            when (slide.type) {
                PageType.PRODUCTS -> ProductPageBoard(
                    catalog = data,
                    page = slide,
                    slideIndex = index % slides.size + 1,
                    slideCount = slides.size,
                )

                PageType.VIDEO -> VideoPageBoard(
                    catalog = data,
                    page = slide,
                    slideIndex = index % slides.size + 1,
                    slideCount = slides.size,
                    paused = paused,
                    onVideoEnded = {
                        slideIndex = (slideIndex + 1) % slides.size
                    },
                )
            }
        }
    }
}

@Composable
private fun FallbackBoard(message: String?) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Color(0xFF160C09),
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.Center,
        ) {
            BoardBackdrop(accent = Color(0xFFD64B3A))

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "Aguardando catalogo",
                    style = MaterialTheme.typography.displayMedium,
                    color = Color.White,
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = message ?: "Carregando dados locais...",
                    style = MaterialTheme.typography.titleLarge,
                    color = Color.White.copy(alpha = 0.72f),
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun ProductPageBoard(
    catalog: CatalogConfig,
    page: CatalogPage,
    slideIndex: Int,
    slideCount: Int,
) {
    val accent = page.accentColor.toColor()
    val rows = page.products
    val titleText = page.name.uppercase(Locale("pt", "BR"))
    val subtitleText = page.banner.ifBlank { catalog.subtitle }
    val slideText = if (slideCount > 1) {
        "${slideIndex.toString().padStart(2, '0')} / ${slideCount.toString().padStart(2, '0')}"
    } else {
        "SLIDE UNICO"
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        BoardHeader(
            title = titleText,
            subtitle = subtitleText,
            accent = accent,
            slideText = slideText,
            invertOrder = true,
        )

        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
        ) {
            if (rows.isEmpty()) {
                EmptyPageState(
                    title = "Nenhum produto cadastrado",
                    subtitle = "Adicione itens nessa página pelo painel web.",
                )
            } else {
                val layout = remember(rows.size, maxHeight, maxWidth) {
                    boardLayoutSpec(
                        productCount = rows.size,
                        availableHeight = maxHeight,
                        availableWidth = maxWidth,
                    )
                }
                val priceFontFamily = FontFamily.Cursive

                if (layout.columns == 1) {
                    SingleBoardColumn(
                        products = rows,
                        layout = layout,
                        priceFontFamily = priceFontFamily,
                    )
                } else {
                    TwoBoardColumns(
                        products = rows,
                        layout = layout,
                        priceFontFamily = priceFontFamily,
                    )
                }
            }
        }
    }
}

@Composable
private fun VideoPageBoard(
    catalog: CatalogConfig,
    page: CatalogPage,
    slideIndex: Int,
    slideCount: Int,
    paused: Boolean,
    onVideoEnded: () -> Unit,
) {
    val accent = page.accentColor.toColor()
    val titleText = page.name.uppercase(Locale("pt", "BR"))
    val subtitleText = page.banner.ifBlank { catalog.subtitle }
    val slideText = if (slideCount > 1) {
        "${slideIndex.toString().padStart(2, '0')} / ${slideCount.toString().padStart(2, '0')}"
    } else {
        "SLIDE UNICO"
    }
    val currentOnVideoEnded by rememberUpdatedState(onVideoEnded)
    val slideDuration = catalog.slideIntervalSeconds.coerceIn(10, 20)
    val videoId = remember(page.videoUrl) { page.videoUrl.extractYouTubeVideoId() }
    var playbackError by remember(page.id) { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        BoardHeader(
            title = titleText,
            subtitle = subtitleText,
            accent = accent,
            slideText = slideText,
        )

        BoxWithConstraints(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
        ) {
            if (videoId.isNullOrBlank()) {
                LaunchedEffect(page.id, paused) {
                    if (paused) return@LaunchedEffect
                    delay(slideDuration * 1_000L)
                    currentOnVideoEnded()
                }

                EmptyPageState(
                    title = "Vídeo do YouTube não configurado",
                    subtitle = "Cole uma URL do YouTube nessa página para iniciar a reprodução.",
                )
            } else {
                Box(modifier = Modifier.fillMaxSize()) {
                    YouTubeVideoPlayer(
                        videoId = videoId,
                        paused = paused,
                        onEnded = {
                            playbackError = null
                            currentOnVideoEnded()
                        },
                        onError = { message ->
                            playbackError = message
                        },
                        modifier = Modifier.fillMaxSize(),
                    )

                    if (playbackError != null) {
                        VideoOverlayMessage(
                            title = "Vídeo bloqueado pelo YouTube",
                            subtitle = playbackError ?: "Esse vídeo não pode tocar embutido. A TV vai seguir para o próximo slide.",
                        )

                        LaunchedEffect(playbackError, paused) {
                            if (paused) return@LaunchedEffect
                            delay(2200L)
                            currentOnVideoEnded()
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun EmptyPageState(
    title: String,
    subtitle: String,
) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = title,
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                textAlign = TextAlign.Center,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = subtitle,
                style = MaterialTheme.typography.titleMedium,
                color = Color.White.copy(alpha = 0.72f),
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun VideoOverlayMessage(
    title: String,
    subtitle: String,
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.72f)),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = title,
                style = MaterialTheme.typography.headlineSmall,
                color = Color.White,
                textAlign = TextAlign.Center,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.titleMedium,
                color = Color.White.copy(alpha = 0.82f),
                textAlign = TextAlign.Center,
            )
        }
    }
}

@Composable
private fun YouTubeVideoPlayer(
    videoId: String,
    paused: Boolean,
    onEnded: () -> Unit,
    onError: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val latestOnEnded = rememberUpdatedState(onEnded)
    val latestOnError = rememberUpdatedState(onError)
    val webView = remember(videoId) {
        createYouTubeWebView(
            context = context,
            videoId = videoId,
            onEnded = {
                Handler(Looper.getMainLooper()).post {
                    latestOnEnded.value()
                }
            },
            onError = { errorMessage ->
                Handler(Looper.getMainLooper()).post {
                    latestOnError.value(errorMessage)
                }
            },
        )
    }

    DisposableEffect(webView) {
        onDispose {
            webView.destroy()
        }
    }

    AndroidView(
        modifier = modifier,
        factory = { webView },
        update = { currentView ->
            currentView.evaluateJavascript(
                if (paused) "pauseVideo();" else "playVideo();",
                null,
            )
        },
    )
}

private fun createYouTubeWebView(
    context: android.content.Context,
    videoId: String,
    onEnded: () -> Unit,
    onError: (String) -> Unit,
): WebView {
    return WebView(context).apply {
        setBackgroundColor(android.graphics.Color.BLACK)
        webChromeClient = WebChromeClient()
        webViewClient = WebViewClient()
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.builtInZoomControls = false
        settings.displayZoomControls = false
        addJavascriptInterface(YouTubeVideoBridge(onEnded, onError), "AndroidSlideBridge")
        loadDataWithBaseURL(
            YOUTUBE_EMBED_ORIGIN,
            buildYouTubeEmbedHtml(videoId, YOUTUBE_EMBED_ORIGIN),
            "text/html",
            "UTF-8",
            null,
        )
    }
}

private class YouTubeVideoBridge(
    private val onEnded: () -> Unit,
    private val onError: (String) -> Unit,
) {
    @JavascriptInterface
    fun onVideoEnded() {
        onEnded()
    }

    @JavascriptInterface
    fun onVideoError(errorMessage: String) {
        onError(errorMessage)
    }
}

private const val YOUTUBE_EMBED_ORIGIN = "https://lillo.local"

private fun buildYouTubeEmbedHtml(videoId: String, origin: String): String {
    val safeVideoId = videoId.replace("'", "\\'")
    val safeOrigin = origin.replace("'", "\\'")
    return """
        <!doctype html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
            <style>
                html, body {
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    overflow: hidden;
                    background: #000;
                }
                body {
                    position: fixed;
                    inset: 0;
                }
                #player {
                    width: 100%;
                    height: 100%;
                }
            </style>
        </head>
        <body>
            <div id="player"></div>
            <script>
                var player;
                var endedSent = false;

                function onYouTubeIframeAPIReady() {
                    player = new YT.Player('player', {
                        videoId: '$safeVideoId',
                        width: '100%',
                        height: '100%',
                        playerVars: {
                            autoplay: 1,
                            controls: 0,
                            rel: 0,
                            modestbranding: 1,
                            playsinline: 1,
                            fs: 0,
                            iv_load_policy: 3,
                            disablekb: 1,
                            enablejsapi: 1,
                            origin: '$safeOrigin',
                            widget_referrer: '$safeOrigin'
                        },
                        events: {
                            onReady: onPlayerReady,
                            onStateChange: onPlayerStateChange,
                            onError: onPlayerError,
                            onAutoplayBlocked: onAutoplayBlocked
                        }
                    });
                }

                function onPlayerReady(event) {
                    event.target.unMute();
                    event.target.setVolume(100);
                    event.target.playVideo();
                }

                function onPlayerStateChange(event) {
                    if (event.data === YT.PlayerState.ENDED && !endedSent) {
                        endedSent = true;
                        if (window.AndroidSlideBridge && AndroidSlideBridge.onVideoEnded) {
                            AndroidSlideBridge.onVideoEnded();
                        }
                    }
                }

                function onPlayerError(event) {
                    if (window.AndroidSlideBridge && AndroidSlideBridge.onVideoError) {
                        AndroidSlideBridge.onVideoError('Este vídeo não permite reprodução embutida.');
                    }
                }

                function onAutoplayBlocked() {
                    if (window.AndroidSlideBridge && AndroidSlideBridge.onVideoError) {
                        AndroidSlideBridge.onVideoError('O navegador bloqueou a reprodução automática.');
                    }
                }

                function playVideo() {
                    if (player && player.playVideo) {
                        if (player.unMute) {
                            player.unMute();
                        }
                        if (player.setVolume) {
                            player.setVolume(100);
                        }
                        player.playVideo();
                    }
                }

                function pauseVideo() {
                    if (player && player.pauseVideo) {
                        player.pauseVideo();
                    }
                }
            </script>
            <script src="https://www.youtube.com/iframe_api"></script>
        </body>
        </html>
    """.trimIndent()
}

private fun String.extractYouTubeVideoId(): String? {
    val input = trim()
    if (input.isBlank()) return null

    val rawIdPattern = Regex("^[A-Za-z0-9_-]{11}$")
    if (rawIdPattern.matches(input)) {
        return input
    }

    return runCatching {
        val uri = Uri.parse(input)
        val host = uri.host?.lowercase(Locale.US).orEmpty()

        when {
            host == "youtu.be" -> uri.lastPathSegment?.takeIf { it.isNotBlank() }?.take(11)
            host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com") -> {
                uri.getQueryParameter("v")?.takeIf { it.isNotBlank() }?.take(11)
                    ?: when (uri.pathSegments.firstOrNull()) {
                        "embed", "shorts", "live" -> uri.pathSegments.getOrNull(1)?.takeIf { it.isNotBlank() }?.take(11)
                        else -> null
                    }
            }
            else -> null
        }
    }.getOrNull()
}

@Composable
private fun BoardHeader(
    title: String,
    subtitle: String,
    accent: Color,
    slideText: String,
    invertOrder: Boolean = false,
) {
    val primaryText = if (invertOrder) subtitle else title
    val secondaryText = if (invertOrder) title else subtitle
    val primaryColor = if (invertOrder) accent.copy(alpha = 0.98f) else Color(0xFFF7EFE6)
    val secondaryColor = if (invertOrder) Color(0xFFF7EFE6) else accent.copy(alpha = 0.98f)
    val primaryStyle = if (invertOrder) {
        MaterialTheme.typography.labelLarge.copy(
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.1.sp,
            shadow = Shadow(
                color = Color.Black.copy(alpha = 0.35f),
                offset = Offset(0f, 1f),
                blurRadius = 4f,
            ),
        )
    } else {
        MaterialTheme.typography.headlineLarge.copy(
            fontSize = 38.sp,
            fontWeight = FontWeight.Black,
            shadow = Shadow(
                color = Color.Black.copy(alpha = 0.55f),
                offset = Offset(0f, 2f),
                blurRadius = 8f,
            ),
        )
    }
    val secondaryStyle = if (invertOrder) {
        MaterialTheme.typography.headlineLarge.copy(
            fontSize = 38.sp,
            fontWeight = FontWeight.Black,
            shadow = Shadow(
                color = Color.Black.copy(alpha = 0.55f),
                offset = Offset(0f, 2f),
                blurRadius = 8f,
            ),
        )
    } else {
        MaterialTheme.typography.labelLarge.copy(
            fontSize = 16.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.1.sp,
            shadow = Shadow(
                color = Color.Black.copy(alpha = 0.35f),
                offset = Offset(0f, 1f),
                blurRadius = 4f,
            ),
        )
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 4.dp, vertical = 2.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(112.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            LilloLogoBadge(
                modifier = Modifier
                    .size(112.dp),
            )

            Spacer(modifier = Modifier.width(14.dp))

            Column(
                modifier = Modifier
                    .weight(1f)
                    .padding(end = 12.dp),
                verticalArrangement = Arrangement.Center,
            ) {
                Text(
                    text = primaryText.uppercase(Locale("pt", "BR")),
                    style = primaryStyle,
                    color = primaryColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Start,
                )
                Spacer(modifier = Modifier.height(3.dp))
                Box(
                    modifier = Modifier
                        .width(96.dp)
                        .height(4.dp)
                        .background(accent, RoundedCornerShape(50)),
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = secondaryText.uppercase(Locale("pt", "BR")),
                    style = secondaryStyle,
                    color = secondaryColor,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    textAlign = TextAlign.Start,
                )
            }

            Spacer(modifier = Modifier.width(12.dp))

            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(50),
                    color = accent.copy(alpha = 0.20f),
                    border = BorderStroke(1.dp, accent.copy(alpha = 0.7f)),
                ) {
                    Text(
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                        text = slideText,
                        style = MaterialTheme.typography.labelLarge.copy(
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Black,
                        ),
                        color = Color.White,
                        fontWeight = FontWeight.Black,
                    )
                }

                Text(
                    text = "PAINEL DIGITAL",
                    style = MaterialTheme.typography.labelMedium.copy(
                        fontSize = 12.sp,
                        letterSpacing = 1.4.sp,
                    ),
                    color = Color.White.copy(alpha = 0.78f),
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(2.dp)
                .background(accent.copy(alpha = 0.55f), RoundedCornerShape(50)),
        )
    }
}

@Composable
private fun LilloLogoBadge(
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier,
        contentAlignment = Alignment.Center,
    ) {
        Image(
            painter = painterResource(R.drawable.logo),
            contentDescription = "Logo Casa de Carnes Lillo",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Fit,
        )
    }
}

@Composable
private fun PriceBoardRow(
    product: Product,
    layout: BoardLayoutSpec,
    priceFontFamily: FontFamily,
    isAlternate: Boolean,
) {
    val rowColor = when {
        product.isPromo -> Color(0xFF7B1118)
        isAlternate -> Color(0xFF6A1118).copy(alpha = 0.42f)
        else -> Color.Transparent
    }

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(layout.rowHeight)
            .background(rowColor, RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(
            modifier = Modifier
                .weight(1f)
                .padding(end = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            if (product.isPromo) {
                PromoBadge()
            }

            Text(
                text = product.name.uppercase(Locale("pt", "BR")),
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.titleMedium.copy(
                    fontSize = layout.nameSize,
                    fontWeight = FontWeight.Black,
                ),
                color = Color.White,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }

        Spacer(modifier = Modifier.width(8.dp))

        PriceTicket(
            product = product,
            ticketWidth = layout.ticketWidth,
            priceSize = layout.priceSize,
            priceFontFamily = priceFontFamily,
        )
    }
}

@Composable
private fun SingleBoardColumn(
    products: List<Product>,
    layout: BoardLayoutSpec,
    priceFontFamily: FontFamily,
) {
    Column(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(layout.rowSpacing),
    ) {
        products.forEachIndexed { index, product ->
            PriceBoardRow(
                product = product,
                layout = layout,
                priceFontFamily = priceFontFamily,
                isAlternate = index % 2 == 1,
            )
        }
    }
}

@Composable
private fun TwoBoardColumns(
    products: List<Product>,
    layout: BoardLayoutSpec,
    priceFontFamily: FontFamily,
) {
    val splitIndex = (products.size + 1) / 2
    val leftColumn = products.take(splitIndex)
    val rightColumn = products.drop(splitIndex)

    Row(
        modifier = Modifier.fillMaxSize(),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(layout.rowSpacing),
        ) {
            leftColumn.forEachIndexed { index, product ->
                PriceBoardRow(
                    product = product,
                    layout = layout,
                    priceFontFamily = priceFontFamily,
                    isAlternate = index % 2 == 1,
                )
            }
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(layout.rowSpacing),
        ) {
            rightColumn.forEachIndexed { index, product ->
                PriceBoardRow(
                    product = product,
                    layout = layout,
                    priceFontFamily = priceFontFamily,
                    isAlternate = index % 2 == 1,
                )
            }
        }
    }
}

@Composable
private fun PromoBadge() {
    val transition = rememberInfiniteTransition(label = "promo_badge")
    val alpha by transition.animateFloat(
        initialValue = 0.78f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(700, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "promo_badge_alpha",
    )

    Surface(
        shape = RoundedCornerShape(50),
        color = Color(0xFFF2D43B).copy(alpha = alpha),
        border = BorderStroke(1.dp, Color(0xFF6B1B15)),
    ) {
        Text(
            modifier = Modifier.padding(horizontal = 9.dp, vertical = 3.dp),
            text = "OFERTA",
            style = MaterialTheme.typography.labelMedium,
            color = Color(0xFF5E140F),
            fontWeight = FontWeight.Black,
            maxLines = 1,
        )
    }
}

@Composable
private fun PriceTicket(
    product: Product,
    ticketWidth: Dp,
    priceSize: TextUnit,
    priceFontFamily: FontFamily,
) {
    val unitTextWidth = 20.dp
    val priceTextWidth = (ticketWidth - 32.dp).coerceAtLeast(56.dp)
    val transition = if (product.isPromo) rememberInfiniteTransition(label = "promo_ticket") else null
    val pulseAlpha = if (transition != null) {
        transition.animateFloat(
            initialValue = 0.94f,
            targetValue = 1.0f,
            animationSpec = infiniteRepeatable(
                animation = tween(850, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse,
            ),
            label = "promo_ticket_alpha",
        ).value
    } else {
        1f
    }

    Surface(
        modifier = Modifier
            .width(ticketWidth)
            .heightIn(min = 40.dp)
            .graphicsLayer(alpha = pulseAlpha),
        shape = RoundedCornerShape(4.dp),
        color = if (product.isPromo) Color(0xFFFFF2C8) else Color(0xFFF1ECE2),
        border = BorderStroke(
            2.dp,
            if (product.isPromo) Color(0xFFC9362D) else Color(0xFFB6A99E),
        ),
    ) {
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 4.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.End,
        ) {
            Text(
                modifier = Modifier.width(priceTextWidth),
                text = formatCompactPrice(product.price),
                style = MaterialTheme.typography.displaySmall.copy(
                    fontSize = priceSize,
                    fontFamily = priceFontFamily,
                    fontWeight = FontWeight.Bold,
                ),
                color = Color(0xFFC9372C),
                maxLines = 1,
                overflow = TextOverflow.Clip,
                textAlign = TextAlign.End,
            )
            Spacer(modifier = Modifier.width(2.dp))
            Text(
                modifier = Modifier.width(unitTextWidth),
                text = product.unit.lowercase(Locale("pt", "BR")),
                style = MaterialTheme.typography.labelSmall.copy(
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Bold,
                ),
                color = Color(0xFF8A3C32),
                maxLines = 1,
                overflow = TextOverflow.Clip,
                textAlign = TextAlign.End,
            )
        }
    }
}

@Composable
private fun BoardBackdrop(accent: Color) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .drawBehind {
                drawRect(Color(0xFF150B09))

                val planks = 12
                val step = size.width / planks
                for (index in 0..planks) {
                    val alpha = if (index % 2 == 0) 0.03f else 0.015f
                    drawLine(
                        color = Color.White.copy(alpha = alpha),
                        start = Offset(step * index, 0f),
                        end = Offset(step * index, size.height),
                        strokeWidth = 3f,
                    )
                }

                drawRect(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            accent.copy(alpha = 0.16f),
                            Color.Transparent,
                        ),
                        center = Offset(size.width * 0.5f, size.height * 0.44f),
                        radius = minOf(size.width, size.height) * 0.78f,
                    ),
                )

                drawRect(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            Color.Transparent,
                            accent.copy(alpha = 0.08f),
                            Color(0xFF7B1118).copy(alpha = 0.16f),
                        ),
                        startY = size.height * 0.58f,
                        endY = size.height,
                    ),
                )
            }
    ) {
        Image(
            painter = painterResource(R.drawable.logo),
            contentDescription = null,
            modifier = Modifier
                .align(Alignment.Center)
                .fillMaxSize()
                .padding(horizontal = 40.dp, vertical = 28.dp)
                .graphicsLayer(alpha = 0.06f),
            contentScale = ContentScale.Fit,
        )
    }
}

private data class BoardLayoutSpec(
    val columns: Int,
    val rowHeight: Dp,
    val rowSpacing: Dp,
    val nameSize: TextUnit,
    val priceSize: TextUnit,
    val ticketWidth: Dp,
)

private fun boardLayoutSpec(
    productCount: Int,
    availableHeight: Dp,
    availableWidth: Dp,
): BoardLayoutSpec {
    val safeCount = productCount.coerceAtLeast(1)
    val minReadableRowHeight = 38.dp
    val narrowSingleColumn = availableWidth < 520.dp
    val tightSingleColumn = availableWidth < 420.dp
    val oneColumnSpacing = 4.dp
    val oneColumnHeight = ((availableHeight - oneColumnSpacing * (safeCount - 1)) / safeCount).coerceAtLeast(24.dp)
    val needsTwoColumns = safeCount > 8 || oneColumnHeight < minReadableRowHeight

    if (!needsTwoColumns) {
        val nameSize = when {
            tightSingleColumn -> 16.sp
            narrowSingleColumn -> 18.sp
            else -> 23.sp
        }
        val priceSize = when {
            tightSingleColumn -> 22.sp
            narrowSingleColumn -> 25.sp
            else -> 31.sp
        }
        val ticketWidth = when {
            tightSingleColumn -> 76.dp
            narrowSingleColumn -> 88.dp
            else -> (availableWidth * 0.20f).coerceIn(120.dp, 160.dp)
        }

        return BoardLayoutSpec(
            columns = 1,
            rowHeight = oneColumnHeight,
            rowSpacing = oneColumnSpacing,
            nameSize = nameSize,
            priceSize = priceSize,
            ticketWidth = ticketWidth,
        )
    }

    val columnCount = 2
    val rowsPerColumn = (safeCount + columnCount - 1) / columnCount
    val twoColumnSpacing = 6.dp
    val twoColumnHeight = ((availableHeight - twoColumnSpacing * (rowsPerColumn - 1)) / rowsPerColumn).coerceAtLeast(28.dp)
    val narrowTwoColumn = availableWidth < 520.dp
    val compactNameSize = when {
        narrowTwoColumn && rowsPerColumn >= 6 -> 14.sp
        narrowTwoColumn -> 15.sp
        rowsPerColumn >= 6 -> 18.sp
        else -> 19.sp
    }
    val compactPriceSize = when {
        narrowTwoColumn && rowsPerColumn >= 6 -> 19.sp
        narrowTwoColumn -> 20.sp
        rowsPerColumn >= 6 -> 24.sp
        else -> 25.sp
    }
    val compactTicketWidth = when {
        narrowTwoColumn && availableWidth < 420.dp -> 88.dp
        narrowTwoColumn -> 96.dp
        availableWidth > 900.dp -> 132.dp
        availableWidth > 700.dp -> 124.dp
        availableWidth > 600.dp -> 116.dp
        else -> 104.dp
    }

    return BoardLayoutSpec(
        columns = 2,
        rowHeight = twoColumnHeight,
        rowSpacing = twoColumnSpacing,
        nameSize = compactNameSize,
        priceSize = compactPriceSize,
        ticketWidth = compactTicketWidth,
    )
}

private fun String.toColor(): Color {
    return runCatching {
        Color(android.graphics.Color.parseColor(this))
    }.getOrElse {
        Color(0xFFD64B3A)
    }
}

private fun formatCompactPrice(value: Double): String {
    val format = NumberFormat.getNumberInstance(Locale("pt", "BR")).apply {
        minimumFractionDigits = 2
        maximumFractionDigits = 2
    }
    return format.format(value)
}
