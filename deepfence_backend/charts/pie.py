import matplotlib.pyplot as plt
import io
import numpy as np
from functools import reduce


class PieChart:
    def __init__(self, data, logscale=False, **pltconfig):
        plt.switch_backend('SVG')
        self.data = data
        self.logscale = logscale
        self.x = [np.log(x) + 0.4 if logscale else x for x in data.values()]
        self.labels = data.keys()
        self.pltconfig = pltconfig

    def _plot_pie(self, ax):
        pltconfig = self.pltconfig

        def pct_callback(pct, data):
            original_total = reduce(lambda acc, el: acc + el, data.values(), 0)
            log_total = reduce(lambda acc, el: acc + el, [np.log(x) + 0.4 for x in data.values()], 0)
            log_value = pct / 100. * log_total
            original_value = round(np.exp(log_value - 0.4))
            # return "{:.2f}%".format(original_value / original_total * 100)
            return "{}".format(int(original_value))

        if self.logscale:
            pltconfig['autopct'] = lambda pt: pct_callback(pt, self.data)

        pltconfig.update({
            "labels": self.labels,
        })
        _, texts, autotexts = ax.pie(self.x, **pltconfig)
        for autotext in autotexts:
            autotext.set_color('grey')
        for text in texts:
            text.set_color('grey')
        ax.axis('equal')

        #legends for pie commented
        # box = ax.get_position()
        # ax.set_position([box.x0, box.y0, box.width, box.height * 0.85])

        # legends = ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.05), ncol=3)
        # for text in legends.get_texts():
        #     text.set_color('grey')

    def svg(self, width_inches=4, height_inches=4):
        fig, ax = plt.subplots(figsize=(width_inches, height_inches))
        self._plot_pie(ax)
        centre_circle = plt.Circle((0, 0), 0.80, fc='white')
        fig = plt.gcf()
        fig.gca().add_artist(centre_circle)
        pie_svg_stream = io.StringIO()
        plt.savefig(pie_svg_stream, format='svg', bbox_inches="tight", pad_inches=0, transparent=True)
        pie_svg_stream.seek(0)
        return pie_svg_stream.read()
