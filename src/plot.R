#!/usr/bin/Rscript
library(ggplot2);
library(viridisLite);
library(RColorBrewer);
library(reshape2);

args <- commandArgs(trailingOnly = TRUE)

# assuming filename is dirname/name.csv
csv <- args[1]
basename <- substring(csv, 1, nchar(csv) - 4)
title <- substring(readLines(csv)[1], 3)

dat <- read.csv(csv, comment.char = '#')
# Have no ideal why I can only get timezone correctly by manually
# adjusting the epoch number.
#
dat$time <- as.Date(as.POSIXct(dat$time + 3600*24
                               , origin='1970-01-01 00:00:00 UTC', tz='UTC'));

theme_set(theme_gray(base_size = 28))
p <- ggplot(dat, aes(x = time, y = value)) +
    geom_line(aes(color = name), size = 1) +
    scale_x_date(date_breaks = 'days', date_labels = '%d %b') +
    scale_color_brewer(palette = 'Dark2') +
    #scale_color_viridis(discrete = TRUE, option = 'A') +
    theme(legend.title = element_blank()) +
    theme(panel.grid.major = element_line(size = .8)
          , panel.grid.minor = element_line(size = .8)) +
    theme(legend.position = c(.05, .95),
          legend.justification = c('left', 'top'),
          legend.box.just = 'right',
          legend.margin = margin(6, 6, 6, 6),
          legend.key.size = unit(1, 'cm'),
          legend.text = element_text(size=18),
          plot.caption = element_text(hjust=.9),
          axis.text.x = element_text(angle=90, vjust=0.5, hjust=1)) +
    labs(title = title, caption = '数据来源：DXY, Isaac Lin', x = '', y = '');

ggsave(plot = p, file = paste(basename, '.svg', sep = '')
       , width = 21, height = 10);
ggsave(plot = p, file = paste(basename, '.png', sep = '')
       , width = 21, height = 10, dpi = 72);
