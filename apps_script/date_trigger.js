function onEdit(e) {
    var sheet = e.source.getActiveSheet();

    // 1. INBOX 시트에서만 작동
    if (sheet.getName() !== "INBOX") return;

    var range = e.range;
    var row = range.getRow();
    var col = range.getColumn();

    // 2. 헤더(1행)는 건드리지 않음
    if (row <= 1) return;

    // 3. B열(Title), C열(Body), D열(IdemKey) 중 하나라도 수정되면
    //    (A열은 1, B=2, C=3, D=4)
    if (col >= 2 && col <= 4) {

        // 4. A열(Date)이 비어있을 때만 현재 시간 입력
        //    (이미 날짜가 있으면 덮어쓰지 않음 -> 수정할 때마다 날짜 바뀌는 거 방지)
        var dateCell = sheet.getRange(row, 1);
        if (dateCell.getValue() === "") {
            var now = new Date();
            // 포맷: YYYY-MM-DD HH:mm:ss
            var formattedDate = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
            dateCell.setValue(formattedDate);
        }
    }
}
