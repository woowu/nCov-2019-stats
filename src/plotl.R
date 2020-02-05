#!/usr/bin/Rscript
library(ggplot2);
library(scales);
#library(viridis);
library(RColorBrewer);

args <- commandArgs(trailingOnly = TRUE)

# assuming filename is dirname/name.csv
csv <- args[1]
basename <- substring(csv, 1, nchar(csv) - 4)
title <- substring(readLines(csv)[1], 3)

dat <- read.csv(csv, comment.char = '#')
dat$date <- as.Date(as.POSIXct(dat$date, origin='1970-01-01'));

theme_set(theme_gray(base_size = 28))
p <- ggplot(dat, aes(x = date, y = value)) +
    geom_line(aes(color = name), size = 1) +
    scale_x_date(date_breaks = 'days', date_labels = '%d %b') +
    scale_y_continuous(trans = 'log10') +
    scale_color_brewer(palette = 'Dark2') +
    #scale_color_viridis(discrete = TRUE, option = 'A') +
    theme(legend.title = element_blank()) +
    theme(panel.grid.major = element_line(size = .8)
          , panel.grid.minor = element_line(size = .8)) +
    theme(legend.position = c(.1, .95),
          legend.justification = c('right', 'top'),
          legend.box.just = 'right',
          legend.margin = margin(6, 6, 6, 6),
          legend.key.size = unit(1, 'cm'),
          legend.text = element_text(size=18)) +
    labs(title = title, x = '', y = 'log10');

ggsave(plot = p, file = paste(basename, '.svg', sep = '')
       , width = 21, height = 10);
ggsave(plot = p, file = paste(basename, '.png', sep = '')
       , width = 21, height = 10, dpi = 72);
