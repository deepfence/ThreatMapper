import matplotlib.pyplot as plt
from matplotlib.ticker import ScalarFormatter
import io


class BarChart:
    def __init__(self, data, logscale_y=False, **config):
        plt.switch_backend('SVG')
        xlabels = list(data)
        self.xticklabels = xlabels
        self.logscale_y = logscale_y
        self.matrix = []
        column_lens = [len(data[key]) for key in xlabels]
        max_columns = 0
        max_column_index = 0
        try:
            max_column_index, max_columns = max(enumerate(column_lens),
                                                key=lambda x: x[1])
        except ValueError:
            pass

        for i in range(0, max_columns):
            column = {
                "label": data[xlabels[max_column_index]][i]['key'],
                'subdata': [data[key][i]['value']
                            if i < len(data[key]) else 0 for key in xlabels],
            }
            self.matrix.append(column)
        self.index = range(0, len(xlabels))
        self.data = data
        self.config = config
        self.bar_width = 0.35

    def _plot(self, ax):
        position = 0
        factor = 1
        for column in self.matrix:
            ax.bar([x + position for x in self.index], column.get('subdata'),
                   self.bar_width, label=column.get('label'))
            position = self.bar_width * factor
            factor += 1

        box = ax.get_position()
        ax.set_position([box.x0, box.y0, box.width, box.height * 0.85])

        legends = ax.legend(loc="upper left", bbox_to_anchor=(0.5, 1.2))
        for text in legends.get_texts():
            text.set_color('grey')
        ax.set_xticks([x + self.bar_width / 2 for x in self.index])
        ax.set_xticklabels(self.xticklabels)
        if self.logscale_y:
            ax.set_yscale('log')
            formatter = ScalarFormatter()
            formatter.set_scientific(False)
            ax.get_yaxis().set_major_formatter(formatter)

    def svg(self, width_inches=4, height_inches=4):
        fig, ax = plt.subplots(figsize=(width_inches, height_inches))
        ax.spines['right'].set_visible(False)
        ax.spines['top'].set_visible(False)
        ax.spines['bottom'].set_color('grey')
        ax.spines['left'].set_color('grey')
        ax.tick_params(axis='x', colors='grey')
        ax.tick_params(axis='y', colors='grey')

        self._plot(ax)
        bar_svg_stream = io.StringIO()
        plt.savefig(bar_svg_stream, format='svg', bbox_inches="tight", pad_inches=0, transparent=True)
        bar_svg_stream.seek(0)
        return bar_svg_stream.read()

    def show(self):
        plt.show()
