var PDFDocument = require('pdfkit');
var crypto = require ('crypto');
var DateFormat = require ('dateformatjs').DateFormat;
var Entities = require ('html-entities').AllHtmlEntities;

function PDFCard (config) {
  this.config = config;
  this.initialize ();

  return this;
}

PDFCard.prototype.initialize = function () {
  this.pdfdoc = new PDFDocument ({
    size: 'a4',
    margins: {
      top: 31,
      bottom: 31,
      left: 31,
      right: 31,
    }, 
  });

  this.pdfdoc.registerFont ('Garuda',
                            '/usr/share/fonts/truetype/tlwg/Garuda.ttf');
  this.pdfdoc.registerFont ('GarudaBold',
                            '/usr/share/fonts/truetype/tlwg/Garuda-Bold.ttf');
  this.pdfdoc.registerFont ('Code',
                            '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf');
  this.pdfdoc.registerFont ('Monospace',
                            '/usr/share/fonts/truetype/tlwg/TlwgTypist.ttf');

  this.margins = 31;
  this.gapWidth = 5;

  this.col = 2;
  this.row = 6;
  this.cardPerPage = this.col * this.row;

  this.safeWidth = this.pdfdoc.page.width - (2 * this.margins);
  this.safeHeight = this.pdfdoc.page.height - (2 * this.margins);

  this.cardWidth  = (this.safeWidth - ((this.col - 1) * 2 * this.gapWidth))
                      / this.col;
  this.cardHeight = (this.safeHeight - ((this.row - 1) * 2 * this.gapWidth))
                      / this.row;

  this.expired = false;
  this.expiredEnabled = false;
}

PDFCard.prototype.model = function (model) {
  this.model = model;

  if (this.model != undefined && this.model.length > 0) {
    var data = this.model[0].meta.expiration;
    if (data.enabled == true) {
      this.expiredEnabled = true;
      var now = new Date;
      var exp = new Date (data.timestamp);

      if (now > exp)
        this.expired = true;
    }
  }

  return this;
};

PDFCard.prototype.cardNotoXY = function (cardNo) {
  var cardNoNorm = cardNo % this.cardPerPage;
  var x = cardNoNorm % this.col;
  var y = (parseInt (cardNoNorm / this.col)) % this.row;

  var xOffset = x * (this.cardWidth +  (2 * this.gapWidth));
  var yOffset = y * (this.cardHeight + (2 * this.gapWidth));

  x = this.margins + xOffset;
  y = this.margins + yOffset;

  return { x: x, y: y };
};

PDFCard.prototype.drawCard = function () {
  var cardAmount = this.model.length;

  for (var i = 0; i < cardAmount; i++) { 
    if (parseInt (i / this.cardPerPage) >=1 &&
          (i % this.cardPerPage) == 0) {

      for (var j = 0; j < this.cardPerPage; j++) {
        var p = this.cardNotoXY (j);
        this.drawCut (p.x, p.y);
      }

      this.pdfdoc.addPage ();
    }

    this.draw (i, this.model[i]);
  }

  for (var i = 0; i < this.cardPerPage; i++) {
    var p = this.cardNotoXY (i);

    this.drawCut (p.x, p.y);
  }
};

PDFCard.prototype.draw = function (cardNo, data) {
  var p = {};
  p = this.cardNotoXY (cardNo);

  this.drawBorder (p.x, p.y);
  this.drawLogo (p.x, p.y);
  this.drawBackground (p.x, p.y);
  this.drawTextInfo (p.x, p.y, data.meta.info);
  this.drawTextSerialNo (p.x, p.y, data.meta.id, data.serialno,
                         data.meta.expiration.timestamp);
  this.drawTextCode (p.x, p.y, data.code);

  if (data.registered.to != undefined ||
        data.registered.to == '') {
    this.drawRedStampText (p.x, p.y, 'REGISTERED');

    var df = new DateFormat ("dd/MM/yyyy HH:mm");

    this.drawUserStampText (p.x, p.y, data.registered.to.firstname + ' ' +
      data.registered.to.surname + ' (' + data.registered.to.username + ') - ' +
      df.format (new Date (data.registered.timestamp)));
  } else {
    if (this.expired) {
      this.drawRedStampText (p.x, p.y, 'EXPIRED');
    }
  }
};


PDFCard.prototype.drawLogo = function (x, y) {
  var imgX = x + 5;
  var imgY = y + 5;

  this.pdfdoc.image ('images/cardlogo.png', imgX, imgY, { fit: [70, 70] });
};

PDFCard.prototype.drawBackground = function (x, y) {
  var bgX  = x + 0.25;
  var bgY  = y + 0.25;

  this.pdfdoc.image ('images/background.png', bgX, bgY,
                     { width: this.cardWidth - 0.5,
                       height: this.cardHeight - 0.5 });
};

PDFCard.prototype.drawBorder = function (x, y) {
  var boxColor = '#666666';

  this.pdfdoc.roundedRect (x, y, this.cardWidth, this.cardHeight, 3)
    .lineWidth (0.5)
    .stroke (boxColor);
};

PDFCard.prototype.drawCut = function (x, y) {
  var _this = this;
  function drawCutMark (cutX, cutY, crossColor) {
    var crossWidth     = (2 * _this.gapWidth);
    var halfCrossWidth = _this.gapWidth;

    _this.pdfdoc.moveTo (cutX - halfCrossWidth, cutY)
      .lineTo (cutX + halfCrossWidth, cutY)
      .moveTo (cutX, cutY - halfCrossWidth)
      .lineTo (cutX, cutY + halfCrossWidth)
      .lineWidth (0.25)
      .stroke (crossColor);
  }

  var cutX = x - this.gapWidth;
  var cutY = y - this.gapWidth;
  var cutX2 = cutX + this.cardWidth  + (2 * this.gapWidth);
  var cutY2 = cutY + this.cardHeight + (2 * this.gapWidth);
  var crossColor = '#dddddd';

  drawCutMark (cutX, cutY, crossColor);
  drawCutMark (cutX2, cutY, crossColor);
  drawCutMark (cutX, cutY2, crossColor);
  drawCutMark (cutX2, cutY2, crossColor);
}

PDFCard.prototype.drawTextInfo = function (x, y, info) {
  var xOffset = x + 100;
  var yOffset = y + 15;
  var width   = this.cardWidth - 100;
  var height  = 30;
  var entities = new Entities ();
  var infoText = info ? entities.decode (info) :
                        'ป้อนรหัสนี้ในหน้าลงทะเบียน เพื่อขอรับรหัสผ่าน\n' +
                        'Apply this code in the register page and ' +
                        'request for new password';

  this.pdfdoc.font ('GarudaBold')
    .fontSize (12)
    .text ('INTERNET ACCESS CODE', xOffset, yOffset,
      { align: 'center',
        width: width,
        height: height,
      });

  var xDesc = x + 5;
  var yDesc = y + 75;

  this.pdfdoc.font ('Garuda')
    .fontSize (8)
    .text (infoText,
           xDesc, yDesc, {
             width: this.cardWidth - 10,
             height: 50,
           });
};

PDFCard.prototype.decipherCode = function (cryptedcode) {
  var decipher = crypto.createDecipher ('aes-256-cbc', this.config.accesscodeKey);
  var dec = decipher.update (cryptedcode, 'hex', 'utf8');
  dec += decipher.final ('utf8');

  var fmt = dec.substring (0, 4) + ' ' + dec.substring (4, 7) + ' ' +
            dec.substring (7);

  return fmt;
};

PDFCard.prototype.drawTextCode = function (x, y, cryptedcode) {
  var xOffset = x + 110;
  var yOffset = y + 40;
  var xTextOffset = xOffset + 2;
  var yTextOffset = yOffset + 2;
  var width   = this.cardWidth - 110 - 10;
  var height  = 25;
  var textSize = { width: width - 4, height: height - 4 };

  this.pdfdoc.rect (xOffset, yOffset, width, height)
    .lineWidth (1.5)
    .stroke ('#ff6600');

  this.pdfdoc.font ('Code')
    .fontSize (18)
    .text (this.decipherCode (cryptedcode), xTextOffset, yTextOffset,
           {
             width: textSize.width,
             height: textSize.height,
             align: 'center',
           });
};

PDFCard.prototype.drawTextSerialNo = function (x, y, id, serialno, exp) {
  var xOffset = x + 100;
  var yOffset = y + 5;
  var width  = this.cardWidth - 110;
  var height = 15;

  var serial = (1e15 + serialno + "").slice(-4);

  this.pdfdoc.font ('Monospace')
    .fontSize (7)
    .text ('ID: ' + id, xOffset, yOffset,
           {
             align: 'left',
             width: width,
             height: height,
           })
    .text ('Serial No: ' + serial, xOffset, yOffset,
           {
             align: 'right',
             width: width,
             height: height,
           });

  if (this.expiredEnabled) {
    var df = new DateFormat ("dd MMM yyyy HH:mm");

    this.pdfdoc.font ('Monospace')
      .fontSize (6)
      .text ('Exp: ' + df.format (new Date (exp)), xOffset, yOffset + 7,
             {
               align: 'right',
               width: width,
               height: height,
             });
  }

};

PDFCard.prototype.drawRedStampText = function (x, y, text) {
  var origin = [x + 220, y];
  this.pdfdoc.font ('Code')
    .rotate (20, { origin: origin })
    .fontSize (28)
    .fill ('#660000')
    .text (text, x, y, {
       width: this.cardWidth - 50,
       height: this.cardHeight,
       align: 'center',
     })
    .fill ('red')
    .text (text, x - 1.5, y - 1.5, {
       width: this.cardWidth - 50,
       height: this.cardHeight,
       align: 'center',
     })

    .rect (x, y, this.cardWidth - 50, 30)
    .stroke ('red');

  this.pdfdoc.fill ('black')
    .rotate (-20, { origin: origin });
};

PDFCard.prototype.drawUserStampText = function (x, y, text) {
  var origin = [x + 320, y];
  this.pdfdoc.font ('Garuda')
    .rotate (20, { origin: origin })
    .fontSize (12)
    .fill ('#ffffff')
    .text (text, x, y, {
       width: this.cardWidth - 50,
       height: this.cardHeight,
       align: 'center',
     })
    .fill ('#006600')
    .text (text, x - 0.5, y - 0.5, {
       width: this.cardWidth - 50,
       height: this.cardHeight,
       align: 'center',
     })

  this.pdfdoc.fill ('black')
    .rotate (-20, { origin: origin });
};

PDFCard.prototype.drawTableHeader = function (x, y, rowHeight) {
  this.pdfdoc.lineWidth (0.25);

  var xOffset = x;
  var yOffset = y;
  var tableWidth = this.safeHeight;
  var colWidth = tableWidth;

  this.pdfdoc.font ('GarudaBold')
    .fontSize (12)
    .text ('ID ' + this.model[0].meta.id, xOffset, yOffset + 2,
           { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, tableWidth, rowHeight)
    .stroke ();

  this.pdfdoc.font ('Garuda')
    .fontSize (9);

  yOffset += rowHeight;

  /* Serial # */
  colWidth = 0.08 * tableWidth;
  this.pdfdoc.text ('Serial #', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Name */
  xOffset += colWidth;
  colWidth = 0.25 * tableWidth;
  this.pdfdoc.text ('Name', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Personal ID/Passport No */
  xOffset += colWidth;
  colWidth = 0.15 * tableWidth;
  this.pdfdoc.text ('Personal ID/Passport No', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Date and Time */
  xOffset += colWidth;
  colWidth = 0.15 * tableWidth;
  this.pdfdoc.text ('Date and Time', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();


  /* Signature */
  xOffset += colWidth;
  colWidth = 0.12 * tableWidth;
  this.pdfdoc.text ('Signature', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Released By */
  xOffset += colWidth;
  colWidth = 0.12 * tableWidth;
  this.pdfdoc.text ('Released By', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Remark */
  xOffset += colWidth;
  colWidth = 0.13 * tableWidth;
  this.pdfdoc.text ('Remark', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();
};

PDFCard.prototype.drawTableRow = function (data, x, y, rowHeight) {
  this.pdfdoc.lineWidth (0.25);

  var xOffset = x;
  var yOffset = y;
  var tableWidth = this.safeHeight;
  var colWidth = tableWidth;

  this.pdfdoc.font ('Garuda')
    .fontSize (9);

  /* Serial # */
  colWidth = 0.08 * tableWidth;
  var serial = (1e15 + data.serialno + "").slice(-4);
  this.pdfdoc.text (serial, xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Name */
  xOffset += colWidth;
  colWidth = 0.25 * tableWidth;
  this.pdfdoc
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Personal ID/Passport No */
  xOffset += colWidth;
  colWidth = 0.15 * tableWidth;
  this.pdfdoc
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Date and Time */
  xOffset += colWidth;
  colWidth = 0.15 * tableWidth;
  this.pdfdoc
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();


  /* Signature */
  xOffset += colWidth;
  colWidth = 0.12 * tableWidth;
  this.pdfdoc
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Released By */
  xOffset += colWidth;
  colWidth = 0.12 * tableWidth;
  this.pdfdoc
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Remark */
  xOffset += colWidth;
  colWidth = 0.13 * tableWidth;
  this.pdfdoc
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();
};


PDFCard.prototype.drawSummary = function () {
  var rowHeight = 24;
  var headRows = 2;
  var rowPerPage = parseInt (this.safeWidth / rowHeight) - headRows;
  var x = this.margins;
  var y = this.margins;
  var pageOpts = { size: 'a4', layout: 'landscape' };

  this.pdfdoc.addPage (pageOpts);
  this.drawTableHeader (x, y, rowHeight);

  for (var i = 0; i < this.model.length; i++) {
    if (parseInt (i / rowPerPage) >= 1 &&
          (i % rowPerPage) == 0) {
      this.pdfdoc.addPage (pageOpts);
      this.drawTableHeader (x, y, rowHeight);
    }

    xOffset = x;
    yOffset = y + (((i % rowPerPage) + headRows) * rowHeight);

    this.drawTableRow (this.model[i], xOffset, yOffset, rowHeight);
  }
};

PDFCard.prototype.output = function (fn) {
  this.drawCard ();
  if (!this.expired) {
    this.drawSummary ();
  }

  this.pdfdoc.output (fn);
};

module.exports = PDFCard;
