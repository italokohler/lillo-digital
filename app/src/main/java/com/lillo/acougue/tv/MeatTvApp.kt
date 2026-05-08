package com.lillo.acougue.tv

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.lillo.acougue.tv.data.CatalogRepository
import com.lillo.acougue.tv.data.model.CatalogLoadState
import com.lillo.acougue.tv.ui.TableStyleTvDisplayScreen
import com.lillo.acougue.tv.ui.theme.MeatTvPalette
import com.lillo.acougue.tv.ui.theme.MeatTvTheme
import kotlinx.coroutines.delay

@Composable
fun MeatTvApp() {
    val context = LocalContext.current
    val repository = remember(context) { CatalogRepository(context) }

    val loadState by produceState<CatalogLoadState>(
        initialValue = CatalogLoadState.Loading,
        key1 = repository,
    ) {
        val localCatalog = repository.loadCatalog()
        value = CatalogLoadState.Success(localCatalog)

        val remoteUrl = localCatalog.remoteCatalogUrl.trim()
        if (remoteUrl.isBlank()) return@produceState

        var currentCatalog = localCatalog
        while (true) {
            val remoteCatalog = repository.loadRemoteCatalog(remoteUrl)
            if (remoteCatalog != null && remoteCatalog != currentCatalog) {
                currentCatalog = remoteCatalog
                value = CatalogLoadState.Success(remoteCatalog)
            }
            delay(3_000L)
        }
    }

    when (val state = loadState) {
        CatalogLoadState.Loading -> {
            MeatTvTheme {
                Surface {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(MeatTvPalette.colors.background)
                    )
                }
            }
        }

        is CatalogLoadState.Success -> {
            MeatTvTheme(themeMode = state.catalog.theme) {
                TableStyleTvDisplayScreen(catalog = state.catalog)
            }
        }

        is CatalogLoadState.Failure -> {
            MeatTvTheme {
                TableStyleTvDisplayScreen(fallbackMessage = state.message)
            }
        }
    }
}
